using System.Security.Claims;
using backend.Services;
using Contracts.DTOs.ActivityLog;
using Contracts.DTOs.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>
/// Handles all activity log (timesheet) endpoints.
///
/// Staff routes  → /api/activitylogs/my/*
/// PM/GM routes  → /api/activitylogs/project/{projectId}/*
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ActivityLogsController : ControllerBase
{
    private readonly ActivityLogService _service;

    public ActivityLogsController(ActivityLogService service)
    {
        _service = service;
    }

    // ── Helper ─────────────────────────────────────────────────────────────

    private string CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub")
        ?? string.Empty;

    private bool IsGm =>
        User.IsInRole("GM") || User.HasClaim("role", "GM");

    // ── Staff: own logs ────────────────────────────────────────────────────

    /// <summary>GET /api/activitylogs/my?projectId=&startDate=&endDate=</summary>
    [HttpGet("my")]
    public async Task<IActionResult> GetMyLogs(
        [FromQuery] int? projectId,
        [FromQuery] string? startDate,
        [FromQuery] string? endDate)
    {
        var data = await _service.GetMyLogsAsync(CurrentUserId, projectId, startDate, endDate);
        return Ok(ApiResponse<List<ActivityLogDto>>.SuccessResponse(data));
    }

    /// <summary>GET /api/activitylogs/my/empty-days — for the alert banner</summary>
    [HttpGet("my/empty-days")]
    public async Task<IActionResult> GetEmptyDays()
    {
        var data = await _service.GetEmptyWorkDaysThisWeekAsync(CurrentUserId);
        return Ok(ApiResponse<List<string>>.SuccessResponse(data));
    }

    /// <summary>GET /api/activitylogs/my/holidays?year=2026&month=9 — for the Attendance Tracker calendar</summary>
    [HttpGet("my/holidays")]
    public async Task<IActionResult> GetMyHolidays([FromQuery] int? year, [FromQuery] int? month, [FromQuery] int? projectId = null)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var y = year ?? today.Year;
        var m = month ?? today.Month;

        var data = await _service.GetHolidaysForUserMonthAsync(CurrentUserId, y, m, projectId);
        // Return as list of { date, name }
        var result = data.Select(h => new { date = h.Date, name = h.Name }).ToList();
        return Ok(ApiResponse<object>.SuccessResponse(result));
    }

    /// <summary>POST /api/activitylogs</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateActivityLogRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var (success, error, data, overHours) = await _service.CreateAsync(CurrentUserId, request);
            if (!success)
                return BadRequest(ApiResponse<ActivityLogDto>.ErrorResponse(error!));

            // 200 with optional warning header
            var response = ApiResponse<ActivityLogDto>.SuccessResponse(data!);
            if (overHours)
                Response.Headers["X-Over-Hours-Warning"] = "true";

            return Ok(response);
        }
        catch (Exception ex)
        {
            return StatusCode(500, "An error occurred while creating the activity log: " + ex.Message);
        }
    }

    /// <summary>PUT /api/activitylogs/{id}</summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateActivityLogRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var (success, error, data, overHours) = await _service.UpdateAsync(id, CurrentUserId, request);
            if (!success)
                return BadRequest(ApiResponse<ActivityLogDto>.ErrorResponse(error!));

            if (overHours)
                Response.Headers["X-Over-Hours-Warning"] = "true";

            return Ok(ApiResponse<ActivityLogDto>.SuccessResponse(data!));
        }
        catch (Exception ex)
        {
            return StatusCode(500, "An error occurred while updating the activity log: " + ex.Message);
        }
    }

    /// <summary>DELETE /api/activitylogs/{id}</summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var (success, error) = await _service.DeleteAsync(id, CurrentUserId);
            if (!success)
                return BadRequest(ApiResponse<string>.ErrorResponse(error!));

            return Ok(ApiResponse<string>.SuccessResponse("Activity log deleted successfully."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, "An error occurred while deleting the activity log: " + ex.Message);
        }
    }

    // ── PM/GM: team logs ───────────────────────────────────────────────────

    /// <summary>GET /api/activitylogs/project/{projectId}/team?date=&startDate=&endDate=&staffUserId=</summary>
    [HttpGet("project/{projectId}/team")]
    public async Task<IActionResult> GetTeamLogs(
        int projectId,
        [FromQuery] string? date,
        [FromQuery] string? startDate,
        [FromQuery] string? endDate,
        [FromQuery] string? staffUserId)
    {
        if (!await _service.CanAccessProjectTeamAsync(CurrentUserId, IsGm, projectId))
            return Forbid();

        var data = await _service.GetTeamLogsAsync(
            CurrentUserId, IsGm, projectId, date, startDate, endDate, staffUserId);
        return Ok(ApiResponse<List<ActivityLogDto>>.SuccessResponse(data));
    }

    /// <summary>GET /api/activitylogs/project/{projectId}/export?startDate=&endDate=</summary>
    [HttpGet("project/{projectId}/export")]
    public async Task<IActionResult> ExportCsv(
        int projectId,
        [FromQuery] string? startDate,
        [FromQuery] string? endDate)
    {
        try
        {
            var (success, error, bytes) = await _service.ExportToCsvAsync(
                CurrentUserId, IsGm, projectId, startDate, endDate);

            if (!success)
                return Forbid();

            var fileName = $"activity_log_project_{projectId}_{DateTime.UtcNow:yyyyMMdd}.csv";
            return File(bytes!, "text/csv; charset=utf-8", fileName);
        }
        catch (Exception ex)
        {
            return StatusCode(500, "An error occurred while exporting: " + ex.Message);
        }
    }
}
