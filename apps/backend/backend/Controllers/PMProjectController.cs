using System.Security.Claims;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>
/// Handles PM timeline and dashboard stats. All endpoints require authentication.
/// Controller is thin — all DB logic lives in PMProjectService.
/// </summary>
[ApiController]
[Route("api/timeline")]
[Authorize]
public class PMProjectController : ControllerBase
{
    private readonly PMProjectService _service;

    public PMProjectController(PMProjectService service)
    {
        _service = service;
    }

    private string? CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ??
        User.FindFirstValue("sub");

    private bool IsPM =>
        User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "PM");

    [HttpGet("projects")]
    public async Task<IActionResult> GetProjectTimeline()
    {
        var result = await _service.GetProjectTimelineAsync(CurrentUserId, IsPM);
        return Ok(result);
    }

    [HttpGet("resources")]
    public async Task<IActionResult> GetResourceTimeline()
    {
        var result = await _service.GetResourceTimelineAsync(CurrentUserId, IsPM);
        return Ok(result);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetDashboardStats()
    {
        var result = await _service.GetDashboardStatsAsync(CurrentUserId, IsPM);
        return Ok(result);
    }
}
