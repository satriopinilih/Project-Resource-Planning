using System.Security.Claims;
using Contracts.DTOs.Common;
using Contracts.DTOs.HireRequest;
using Entities;
using Entities.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HireRequestsController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public HireRequestsController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<HireRequestDto>>>> GetAll([FromQuery] string? status, [FromQuery] int? projectId)
    {
        var query = _db.HireRequests.AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(h => h.Status == status);
        }
        if (projectId.HasValue)
        {
            query = query.Where(h => h.ProjectId == projectId.Value);
        }

        var rows = await query.OrderByDescending(h => h.CreatedAt).ToListAsync();
        var data = rows.Select(Map).ToList();
        return Ok(ApiResponse<List<HireRequestDto>>.SuccessResponse(data));
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<ApiResponse<HireRequestDto>>> Create([FromBody] CreateHireRequestDto request)
    {
        var isGm = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "GM");
        if (!isGm)
        {
            return StatusCode(403, ApiResponse<HireRequestDto>.ErrorResponse("Only GM can create hire requests"));
        }

        var actor = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value ?? "GM001";

        var entity = new HireRequest
        {
            RequestedBy = actor,
            ProjectId = request.ProjectId,
            ProjectName = request.ProjectName,
            RoleNeeded = request.RoleNeeded,
            Quantity = Math.Max(1, request.Quantity),
            StartDate = DateTime.SpecifyKind(request.StartDate, DateTimeKind.Utc),
            EndDate = DateTime.SpecifyKind(request.EndDate, DateTimeKind.Utc),
            Notes = request.Notes,
            Status = "Open",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = actor,
            UpdatedBy = actor
        };

        _db.HireRequests.Add(entity);
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<HireRequestDto>.SuccessResponse(Map(entity), "Hire request created"));
    }

    [Authorize]
    [HttpPost("{id}/start")]
    public async Task<ActionResult<ApiResponse<HireRequestDto>>> Start(int id)
    {
        var isHr = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "HR");
        if (!isHr)
        {
            return StatusCode(403, ApiResponse<HireRequestDto>.ErrorResponse("Only HR can start hire requests"));
        }

        var row = await _db.HireRequests.FirstOrDefaultAsync(h => h.HireRequestId == id);
        if (row is null)
        {
            return NotFound(ApiResponse<HireRequestDto>.ErrorResponse("Hire request not found"));
        }

        row.Status = "InProgress";
        row.UpdatedAt = DateTime.UtcNow;
        row.UpdatedBy = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "HR";
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<HireRequestDto>.SuccessResponse(Map(row), "Hire request started"));
    }

    [Authorize]
    [HttpPost("{id}/fulfill")]
    public async Task<ActionResult<ApiResponse<HireRequestDto>>> Fulfill(int id, [FromBody] UpdateHireRequestStatusDto request)
    {
        var isHr = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "HR");
        var isMarketing = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "Marketing");

        var row = await _db.HireRequests.FirstOrDefaultAsync(h => h.HireRequestId == id);
        if (row is null)
        {
            return NotFound(ApiResponse<HireRequestDto>.ErrorResponse("Hire request not found"));
        }

        // Allow HR for regular hired, or Marketing specifically for Timeline Edit Request
        if (!isHr && !(isMarketing && row.RoleNeeded == "Timeline Edit Request"))
        {
            return StatusCode(403, ApiResponse<HireRequestDto>.ErrorResponse("Unauthorized to fulfill this request"));
        }

        row.Status = "Fulfilled";
        row.HiredEmployeeName = request.HiredEmployeeName;
        if (!string.IsNullOrWhiteSpace(request.Notes))
        {
            row.Notes = request.Notes;
        }
        row.FulfilledAt = DateTime.UtcNow;
        row.UpdatedAt = DateTime.UtcNow;
        row.UpdatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value ?? (isMarketing ? "Marketing" : "HR");
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<HireRequestDto>.SuccessResponse(Map(row), "Hire request fulfilled"));
    }

    [Authorize]
    [HttpPost("{id}/decline")]
    public async Task<ActionResult<ApiResponse<HireRequestDto>>> Decline(int id, [FromBody] UpdateHireRequestStatusDto request)
    {
        var isHr = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "HR");
        var isMarketing = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "Marketing");

        var row = await _db.HireRequests.FirstOrDefaultAsync(h => h.HireRequestId == id);
        if (row is null)
        {
            return NotFound(ApiResponse<HireRequestDto>.ErrorResponse("Hire request not found"));
        }

        // Allow HR for regular hired, or Marketing specifically for Timeline Edit Request
        if (!isHr && !(isMarketing && row.RoleNeeded == "Timeline Edit Request"))
        {
            return StatusCode(403, ApiResponse<HireRequestDto>.ErrorResponse("Unauthorized to decline this request"));
        }

        row.Status = "Declined";
        if (!string.IsNullOrWhiteSpace(request.Notes))
        {
            row.Notes = request.Notes;
        }
        row.FulfilledAt = DateTime.UtcNow;
        row.UpdatedAt = DateTime.UtcNow;
        row.UpdatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value ?? (isMarketing ? "Marketing" : "HR");
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<HireRequestDto>.SuccessResponse(Map(row), "Hire request declined"));
    }

    private static HireRequestDto Map(HireRequest row) => new()
    {
        HireRequestId = row.HireRequestId,
        RequestedBy = row.RequestedBy,
        ProjectId = row.ProjectId,
        ProjectName = row.ProjectName,
        RoleNeeded = row.RoleNeeded,
        Quantity = row.Quantity,
        StartDate = row.StartDate,
        EndDate = row.EndDate,
        Notes = row.Notes,
        Status = row.Status,
        HiredEmployeeName = row.HiredEmployeeName,
        CreatedAt = row.CreatedAt,
        FulfilledAt = row.FulfilledAt
    };
}
