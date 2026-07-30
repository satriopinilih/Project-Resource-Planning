using Contracts.DTOs.Common;
using Contracts.DTOs.HireRequest;
using Entities;
using Entities.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;

namespace backend.Services;

public class HireRequestService
{
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _configuration;

    public HireRequestService(ApplicationDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    /// <summary>
    /// Retrieves all hire requests, optionally filtered by status and projectId.
    /// Uses AsNoTracking since this is a read-only display query.
    /// </summary>
    public async Task<List<HireRequestDto>> GetAllAsync(string? status, int? projectId)
    {
        var query = _db.HireRequests.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(h => h.Status == status);
        }
        if (projectId.HasValue)
        {
            query = query.Where(h => h.ProjectId == projectId.Value);
        }

        var rows = await query.OrderByDescending(h => h.CreatedAt).ToListAsync();
        return rows.Select(Map).ToList();
    }

    public async Task<(bool Success, string? Error, int StatusCode, HireRequestDto? Data)> CreateAsync(CreateHireRequestDto request, string requestedBy)
    {
        // Prevent spamming Project Deletion/Restoration requests
        if (request.RoleNeeded == "Project Deletion Request" || request.RoleNeeded == "Project Restoration Request")
        {
            if (request.ProjectId.HasValue)
            {
                var existingRequest = await _db.HireRequests
                    .Where(h => h.ProjectId == request.ProjectId && h.RoleNeeded == request.RoleNeeded && (h.Status == "Open" || h.Status == "InProgress"))
                    .FirstOrDefaultAsync();

                if (existingRequest != null)
                {
                    return (false, $"There is already a pending {request.RoleNeeded} for this project.", 400, null);
                }
            }
        }

        var entity = new HireRequest
        {
            RequestedBy = requestedBy,
            ProjectId = request.ProjectId,
            ProjectName = request.ProjectName,
            RoleNeeded = request.RoleNeeded,
            Quantity = Math.Max(1, request.Quantity),
            ExperienceYearsRange = request.ExperienceYearsRange,
            StartDate = DateTime.SpecifyKind(request.StartDate, DateTimeKind.Utc),
            EndDate = DateTime.SpecifyKind(request.EndDate, DateTimeKind.Utc),
            Notes = request.Notes,
            Status = "Open",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = requestedBy,
            UpdatedBy = requestedBy
        };

        _db.HireRequests.Add(entity);
        await _db.SaveChangesAsync();

        var gmUser = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == requestedBy);
        var gmName = gmUser?.UserName ?? "GM";

        string aisMessage = $"GM {gmName} requested {entity.Quantity}x {entity.RoleNeeded}";
        if (!string.IsNullOrWhiteSpace(entity.ProjectName))
        {
            aisMessage += $" for project {entity.ProjectName}.";
        }
        else
        {
            aisMessage += " (General Hiring).";
        }
        if (!string.IsNullOrWhiteSpace(entity.Notes))
        {
            aisMessage += $" Notes: {entity.Notes}";
        }

        await SendNotificationToAisAsync("HR", aisMessage, 101);

        return (true, null, 201, Map(entity));
    }

    /// <summary>
    /// Starts processing a hire request. Only HR can do this.
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode, HireRequestDto? Data)> StartAsync(int id, string actorUserId)
    {
        var row = await _db.HireRequests.FirstOrDefaultAsync(h => h.HireRequestId == id);
        if (row is null)
            return (false, "Hire request not found", 404, null);

        row.Status = "InProgress";
        row.UpdatedAt = DateTime.UtcNow;
        row.UpdatedBy = actorUserId;
        await _db.SaveChangesAsync();

        await NotifyGmsAsync(row, "InProgress", null, null);

        return (true, null, 200, Map(row));
    }

    /// <summary>
    /// Marks a hire request as fulfilled.
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode, HireRequestDto? Data)> FulfillAsync(
        int id, UpdateHireRequestStatusDto request, string actorUserId)
    {
        var row = await _db.HireRequests.FirstOrDefaultAsync(h => h.HireRequestId == id);
        if (row is null)
            return (false, "Hire request not found", 404, null);

        row.Status = "Fulfilled";
        row.HiredEmployeeName = request.HiredEmployeeName;
        if (!string.IsNullOrWhiteSpace(request.Notes))
        {
            row.Notes = request.Notes;
        }
        row.FulfilledAt = DateTime.UtcNow;
        row.UpdatedAt = DateTime.UtcNow;
        row.UpdatedBy = actorUserId;
        await _db.SaveChangesAsync();

        await NotifyGmsAsync(row, "Fulfilled", request.HiredEmployeeName, request.Notes);

        return (true, null, 200, Map(row));
    }

    /// <summary>
    /// Marks a hire request as declined.
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode, HireRequestDto? Data)> DeclineAsync(
        int id, UpdateHireRequestStatusDto request, string actorUserId)
    {
        var row = await _db.HireRequests.FirstOrDefaultAsync(h => h.HireRequestId == id);
        if (row is null)
            return (false, "Hire request not found", 404, null);

        row.Status = "Declined";
        if (!string.IsNullOrWhiteSpace(request.Notes))
        {
            row.Notes = request.Notes;
        }
        row.FulfilledAt = DateTime.UtcNow;
        row.UpdatedAt = DateTime.UtcNow;
        row.UpdatedBy = actorUserId;
        await _db.SaveChangesAsync();

        await NotifyGmsAsync(row, "Declined", null, request.Notes);

        return (true, null, 200, Map(row));
    }

    /// <summary>
    /// Updates status, hired employee name and notes of a hire request.
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode, HireRequestDto? Data)> UpdateStatusAsync(
        int id, UpdateHireRequestStatusDto request, string actorUserId)
    {
        var row = await _db.HireRequests.FirstOrDefaultAsync(h => h.HireRequestId == id);
        if (row is null)
            return (false, "Hire request not found", 404, null);

        if (string.IsNullOrWhiteSpace(request.Status))
            return (false, "Status is required", 400, null);

        row.Status = request.Status;
        if (!string.IsNullOrWhiteSpace(request.HiredEmployeeName))
        {
            row.HiredEmployeeName = request.HiredEmployeeName;
        }

        if (!string.IsNullOrWhiteSpace(request.Notes))
        {
            row.Notes = request.Notes;
        }

        if (request.Status == "Fulfilled" || request.Status == "Declined")
        {
            row.FulfilledAt = DateTime.UtcNow;
        }

        row.UpdatedAt = DateTime.UtcNow;
        row.UpdatedBy = actorUserId;

        await _db.SaveChangesAsync();

        await NotifyGmsAsync(row, request.Status, request.HiredEmployeeName, request.Notes);

        return (true, null, 200, Map(row));
    }

    private static HireRequestDto Map(HireRequest row) => new()
    {
        HireRequestId = row.HireRequestId,
        RequestedBy = row.RequestedBy,
        ProjectId = row.ProjectId,
        ProjectName = row.ProjectName,
        RoleNeeded = row.RoleNeeded,
        Quantity = row.Quantity,
        ExperienceYearsRange = row.ExperienceYearsRange,
        StartDate = row.StartDate,
        EndDate = row.EndDate,
        Notes = row.Notes,
        Status = row.Status,
        HiredEmployeeName = row.HiredEmployeeName,
        CreatedAt = row.CreatedAt,
        FulfilledAt = row.FulfilledAt
    };

    private async Task NotifyGmsAsync(HireRequest row, string status, string? hiredEmployeeName, string? notes)
    {
        if (row.RoleNeeded == "Project Deletion Request" || 
            row.RoleNeeded == "Project Restoration Request" || 
            row.RoleNeeded == "Status Override Notification" || 
            row.RoleNeeded == "Timeline Edit Request")
        {
            return;
        }

        var gms = await _db.UserRoles
            .Include(ur => ur.Role)
            .Where(ur => ur.Role.RoleName == Commons.Enums.RoleName.GM)
            .Select(ur => ur.UserId)
            .ToListAsync();

        string candidateText = !string.IsNullOrWhiteSpace(hiredEmployeeName)
            ? $"**{hiredEmployeeName}** ({row.RoleNeeded})"
            : $"candidate for **{row.RoleNeeded}**";

        int? notifProjectId = row.ProjectId.HasValue && row.ProjectId.Value > 0
            ? row.ProjectId.Value
            : null;

        string swapReason;
        if (row.ProjectId.HasValue && row.ProjectId.Value > 0)
        {
            swapReason = $"Hiring update: {candidateText} is now at the **{status}** stage for project **{row.ProjectName}**.";
        }
        else
        {
            swapReason = $"Hiring update: {candidateText} is now at the **{status}** stage (General Hiring).";
        }

        if (!string.IsNullOrWhiteSpace(notes))
        {
            swapReason += $" Notes: {notes}";
        }

        foreach (var gmId in gms)
        {
            var notif = new UserProject
            {
                UserId = gmId,
                ProjectId = notifProjectId,
                RoleInProject = "GM Notification",
                Status = Commons.Enums.UserProjectStatus.Assigned,
                IsNotificationRead = false,
                SwapReason = swapReason,
                StartDate = DateTime.UtcNow,
                EndDate = DateTime.UtcNow
            };
            _db.UserProjects.Add(notif);
        }

        await _db.SaveChangesAsync();

        var plainMessage = swapReason.Replace("**", "");
        await SendNotificationToAisAsync("GM", plainMessage, 101);
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
