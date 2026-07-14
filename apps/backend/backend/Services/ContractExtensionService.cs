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

        var row = new ContractExtension
        {
            UserId = request.UserId,
            RequestedBy = requestedBy,
            ExtensionDuration = request.ExtensionDuration,
            ReasonForExtension = request.ReasonForExtension,
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

        row.User.ContractEnd = row.User.ContractEnd.AddMonths(row.ExtensionDuration);
        row.User.ContractStatus = ContractStatus.Active;
        row.User.UpdatedAt = DateTime.UtcNow;
        row.User.UpdatedBy = processedBy;

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

    private static ContractExtensionDto MapToDto(ContractExtension c)
    {
        return new ContractExtensionDto
        {
            ContractExtensionRequestID = c.ContractExtensionRequestID,
            RequestedBy = c.RequestedBy,
            RequestedByName = c.RequestedByUser?.UserName ?? c.RequestedBy,
            UserId = c.UserId,
            UserName = c.User?.UserName ?? c.UserId,
            ExtensionDuration = c.ExtensionDuration,
            ReasonForExtension = c.ReasonForExtension,
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
