using Commons.Enums;
using Contracts.DTOs.ContractExtension;
using Entities;
using Entities.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;

namespace backend.Services;

public class ContractExtensionService
{
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _configuration;

    public ContractExtensionService(ApplicationDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    /// <summary>
    /// Retrieves all contract extension requests, optionally filtered by status.
    /// Uses AsNoTracking since this is a read-only display query.
    /// </summary>
    public async Task<List<ContractExtensionDto>> GetAllAsync(string? status)
    {
        var query = _db.ContractExtensions
            .AsNoTracking()
            .Include(c => c.User)
            .Include(c => c.RequestedByUser)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(c => c.Status == status);
        }

        var rows = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
        return rows.Select(MapToDto).ToList();
    }

    /// <summary>
    /// Creates a new contract extension request. Only GM can create.
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode, ContractExtensionDto? Data)> CreateAsync(
        CreateContractExtensionDto request, string requestedBy)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == request.UserId);
        if (user is null)
        {
            return (false, "Employee not found", 400, null);
        }

        var reason = request.ReasonForExtension;
        if (request.ExpectedEndDate.HasValue)
        {
            reason = $"[TARGET_DATE:{request.ExpectedEndDate.Value:yyyy-MM-dd}] {reason}";
        }

        var row = new ContractExtension
        {
            UserId = request.UserId,
            RequestedBy = requestedBy,
            ExtensionDuration = request.ExtensionDuration,
            ReasonForExtension = reason,
            NewRole = string.IsNullOrWhiteSpace(request.NewRole) ? null : request.NewRole.Trim(),
            Status = "Pending",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = requestedBy,
            UpdatedBy = requestedBy
        };

        _db.ContractExtensions.Add(row);
        await _db.SaveChangesAsync();

        var created = await _db.ContractExtensions
            .AsNoTracking()
            .Include(c => c.User)
            .Include(c => c.RequestedByUser)
            .FirstOrDefaultAsync(c => c.ContractExtensionRequestID == row.ContractExtensionRequestID);

        if (created == null)
            return (false, "Failed to retrieve created record", 500, null);

        var employeeName = created.User?.UserName ?? created.UserId;
        var requestedByName = created.RequestedByUser?.UserName ?? created.RequestedBy;
        var aisMessage = $"GM {requestedByName} has requested to extend contract of {employeeName} for {created.ExtensionDuration} months. Reason: {created.ReasonForExtension}";
        await SendNotificationToAisAsync("HR", aisMessage, 100);

        return (true, null, 200, MapToDto(created));
    }

    /// <summary>
    /// Approves a pending contract extension request, updating the user's contract end date.
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode, ContractExtensionDto? Data)> ApproveAsync(
        ApproveContractExtensionDto request, string processedBy)
    {
        var row = await _db.ContractExtensions
            .Include(c => c.User)
                .ThenInclude(u => u.UserStaffRoles)
                .ThenInclude(usr => usr.StaffRole)
            .Include(c => c.RequestedByUser)
            .FirstOrDefaultAsync(c => c.ContractExtensionRequestID == request.ContractExtensionRequestID);

        if (row is null)
            return (false, "Request not found", 404, null);

        if (row.Status != "Pending")
            return (false, "Request already processed", 400, null);

        row.Status = "Approved";
        row.ProcessedAt = DateTime.UtcNow;
        row.ProcessedBy = processedBy;
        row.UpdatedAt = DateTime.UtcNow;
        row.UpdatedBy = processedBy;

        // Check if exact target date was encoded in the reason (Auto-rec mode)
        DateTime? targetDate = null;
        if (row.ReasonForExtension.StartsWith("[TARGET_DATE:"))
        {
            var endIdx = row.ReasonForExtension.IndexOf(']');
            if (endIdx > 13)
            {
                var dateStr = row.ReasonForExtension.Substring(13, endIdx - 13);
                if (DateTime.TryParse(dateStr, out var parsed))
                    targetDate = parsed;
            }
        }

        // Auto-rec mode: use the exact target date supplied by the GM.
        // Manual mode: add the month count to the current contract end.
        row.User.ContractEnd = targetDate.HasValue
            ? targetDate.Value.Date
            : row.User.ContractEnd.AddMonths(row.ExtensionDuration);
        row.User.ContractStatus = ContractStatus.Active;
        row.User.UpdatedAt = DateTime.UtcNow;
        row.User.UpdatedBy = processedBy;

        // ── Role Change (Opsi B: applied on Approve) ──────────────────────────
        if (!string.IsNullOrWhiteSpace(row.NewRole))
        {
            var currentRoleName = row.User.UserStaffRoles
                .Select(usr => usr.StaffRole?.RoleName)
                .FirstOrDefault();

            bool roleChanged = !string.Equals(row.NewRole.Trim(), currentRoleName, StringComparison.OrdinalIgnoreCase);
            if (roleChanged)
            {
                var now = DateTime.UtcNow;

                // 1. Close the current active EmployeeRoleHistory entry (if exists)
                var activeRoleHistory = await _db.EmployeeRoleHistories
                    .Where(rh => rh.UserId == row.UserId && rh.IsCurrentRole)
                    .FirstOrDefaultAsync();

                if (activeRoleHistory != null)
                {
                    activeRoleHistory.EndDate = now;
                    activeRoleHistory.IsCurrentRole = false;
                }
                else if (!string.IsNullOrWhiteSpace(currentRoleName))
                {
                    // Seed an initial entry for the old role (first-time tracking)
                    _db.EmployeeRoleHistories.Add(new Entities.Entities.EmployeeRoleHistory
                    {
                        UserId = row.UserId,
                        RoleName = currentRoleName,
                        StartDate = row.User.ContractStart,
                        EndDate = now,
                        IsCurrentRole = false,
                        ChangedBy = processedBy
                    });
                }

                // 2. Insert new EmployeeRoleHistory entry for the new role
                _db.EmployeeRoleHistories.Add(new Entities.Entities.EmployeeRoleHistory
                {
                    UserId = row.UserId,
                    RoleName = row.NewRole.Trim(),
                    StartDate = now,
                    EndDate = null,
                    IsCurrentRole = true,
                    ChangedBy = processedBy
                });

                // 3. Update UserStaffRole to the new role
                //    Find or create the StaffRole record
                var staffRole = await _db.StaffRoles
                    .FirstOrDefaultAsync(sr => sr.RoleName == row.NewRole.Trim());

                if (staffRole == null)
                {
                    staffRole = new Entities.Entities.StaffRole { RoleName = row.NewRole.Trim() };
                    _db.StaffRoles.Add(staffRole);
                    await _db.SaveChangesAsync(); // flush to get StaffRoleId
                }

                // Replace existing UserStaffRole entries
                var existingUserStaffRoles = await _db.UserStaffRoles
                    .Where(usr => usr.UserId == row.UserId)
                    .ToListAsync();
                _db.UserStaffRoles.RemoveRange(existingUserStaffRoles);

                _db.UserStaffRoles.Add(new Entities.Entities.UserStaffRole
                {
                    UserId = row.UserId,
                    StaffRoleId = staffRole.StaffRoleId
                });
            }
        }

        await _db.SaveChangesAsync();

        var employeeName = row.User?.UserName ?? row.UserId;
        var hrUser = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == processedBy);
        var hrName = hrUser?.UserName ?? "HR";
        var aisMessage = $"{hrName} has APPROVED the contract extension request for {employeeName} ({row.ExtensionDuration} months).";
        await SendNotificationToAisAsync("GM", aisMessage, 100);

        return (true, null, 200, MapToDto(row));
    }

    /// <summary>
    /// Declines a pending contract extension request.
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode, ContractExtensionDto? Data)> DeclineAsync(
        DeclineContractExtensionDto request, string processedBy)
    {
        var row = await _db.ContractExtensions
            .Include(c => c.User)
            .Include(c => c.RequestedByUser)
            .FirstOrDefaultAsync(c => c.ContractExtensionRequestID == request.ContractExtensionRequestID);

        if (row is null)
            return (false, "Request not found", 404, null);

        if (row.Status != "Pending")
            return (false, "Request already processed", 400, null);

        row.Status = "Declined";
        row.DeclineReason = request.DeclineReason;
        row.ProcessedAt = DateTime.UtcNow;
        row.ProcessedBy = processedBy;
        row.UpdatedAt = DateTime.UtcNow;
        row.UpdatedBy = processedBy;

        await _db.SaveChangesAsync();

        var employeeName = row.User?.UserName ?? row.UserId;
        var hrUser = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == processedBy);
        var hrName = hrUser?.UserName ?? "HR";
        var aisMessage = $"{hrName} has DECLINED the contract extension request for {employeeName}. Reason: {row.DeclineReason}";
        await SendNotificationToAisAsync("GM", aisMessage, 100);

        return (true, null, 200, MapToDto(row));
    }

    /// <summary>
    /// Builds a smart recommendation for the contract extension modal.
    /// Finds all active (Running = 2) projects the user is assigned to and checks if any end later than the user's contract.
    /// Duration is ceiled to the nearest whole month; the recommended end date is the exact latest project end date.
    /// </summary>
    public async Task<ContractExtensionRecommendationDto> GetRecommendationAsync(string userId)
    {
        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (user is null)
            return new ContractExtensionRecommendationDto { HasRecommendation = false };

        // Fetch active (Running) UserProject entries with their project
        var userProjects = await _db.Set<Entities.Entities.UserProject>()
            .AsNoTracking()
            .Include(up => up.Project)
            .Where(up => up.UserId == userId && up.Project != null)
            .ToListAsync();

        var activeProjects = userProjects
            .Where(up => up.Project!.ProjectStatus == Commons.Enums.ProjectStatus.Running)
            .Select(up => up.Project!)
            .DistinctBy(p => p.ProjectID)
            .ToList();

        if (activeProjects.Count == 0)
            return new ContractExtensionRecommendationDto
            {
                HasRecommendation = false,
                ActiveProjects = new List<ActiveProjectInfo>(),
                CurrentContractEnd = user.ContractEnd
            };

        // Find the project with the latest estimated end date
        var latestProject = activeProjects.OrderByDescending(p => p.EstimatedEndDate).First();
        var contractEnd = user.ContractEnd.Date;

        // Check if any project's end date exceeds the current contract end
        bool hasRecommendation = latestProject.EstimatedEndDate.Date > contractEnd;

        // Build project info list (mark the one with the latest end date)
        var projectInfos = activeProjects
            .OrderByDescending(p => p.EstimatedEndDate)
            .Select(p => new ActiveProjectInfo
            {
                ProjectName = p.ProjectName,
                EstEndDate = p.EstimatedEndDate,
                IsLatest = p.ProjectID == latestProject.ProjectID
            })
            .ToList();

        if (!hasRecommendation)
            return new ContractExtensionRecommendationDto
            {
                HasRecommendation = false,
                ActiveProjects = projectInfos,
                CurrentContractEnd = user.ContractEnd
            };

        // Calculate duration in months (Math.Ceiling to full months)
        var latestEnd = latestProject.EstimatedEndDate.Date;
        double totalDays = (latestEnd - contractEnd).TotalDays;
        double months = totalDays / 30.4375; // Average days per month
        int recommendedMonths = (int)Math.Ceiling(months);

        // Build auto-generated justification text
        var projectList = string.Join("; ", projectInfos
            .Select(p => $"{p.ProjectName} ({p.EstEndDate!.Value.ToString("MMM d, yyyy")})"));
        var justification = $"Extension recommended to cover active project commitments: {projectList}. Aligned with latest delivery milestone.";

        return new ContractExtensionRecommendationDto
        {
            HasRecommendation = true,
            ActiveProjects = projectInfos,
            RecommendedDurationMonths = recommendedMonths,
            RecommendedEndDate = latestProject.EstimatedEndDate,
            JustificationText = justification,
            CurrentContractEnd = user.ContractEnd
        };
    }

    private static ContractExtensionDto MapToDto(ContractExtension c)
    {
        var cleanReason = c.ReasonForExtension;
        if (cleanReason.StartsWith("[TARGET_DATE:"))
        {
            var endIdx = cleanReason.IndexOf(']');
            if (endIdx > -1 && cleanReason.Length > endIdx + 1)
                cleanReason = cleanReason.Substring(endIdx + 1).TrimStart();
        }

        return new ContractExtensionDto
        {
            ContractExtensionRequestID = c.ContractExtensionRequestID,
            RequestedBy = c.RequestedBy,
            RequestedByName = c.RequestedByUser?.UserName ?? c.RequestedBy,
            UserId = c.UserId,
            UserName = c.User?.UserName ?? c.UserId,
            ExtensionDuration = c.ExtensionDuration,
            ReasonForExtension = cleanReason,
            NewRole = c.NewRole,
            CreatedAt = c.CreatedAt,
            Status = c.Status
        };
    }

    private async Task SendNotificationToAisAsync(string recipientRole, string message, int type)
    {
        try
        {
            var aisBaseUrl = _configuration["AisConfig:BaseUrl"];
            var aisApiKey = _configuration["AisConfig:ApiKey"];
            if (string.IsNullOrEmpty(aisBaseUrl) || string.IsNullOrEmpty(aisApiKey))
            {
                return;
            }

            var targetUrl = $"{aisBaseUrl.TrimEnd('/')}/api/v1/notification/receive";
            
            var handler = new HttpClientHandler
            {
                ServerCertificateCustomValidationCallback = (msg, cert, chain, errors) => true
            };
            using var client = new HttpClient(handler);
            using var request = new HttpRequestMessage(HttpMethod.Post, targetUrl);
            request.Headers.Add("ApiKey", aisApiKey);
            
            var payload = new
            {
                RecipientRole = recipientRole,
                Message = message,
                Type = type
            };
            request.Content = JsonContent.Create(payload);

            var response = await client.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var errorMsg = await response.Content.ReadAsStringAsync();
            }
        }
        catch (Exception)
        {
            // Ignore
        }
    }
}
