using Contracts.DTOs.Common;
using Contracts.DTOs.HireRequest;
using Entities;
using Entities.Entities;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public class HireRequestService
{
    private readonly ApplicationDbContext _db;

    public HireRequestService(ApplicationDbContext db)
    {
        _db = db;
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

    /// <summary>
    /// Creates a new hire request.
    /// </summary>
    public async Task<HireRequestDto> CreateAsync(CreateHireRequestDto request, string requestedBy)
    {
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

        return Map(entity);
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
}
