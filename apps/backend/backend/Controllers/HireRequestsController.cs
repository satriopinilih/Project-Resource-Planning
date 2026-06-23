using System.Security.Claims;
using backend.Services;
using Contracts.DTOs.Common;
using Contracts.DTOs.HireRequest;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>
/// Handles hire request CRUD. All endpoints require authentication.
/// Controller is thin — all DB logic lives in HireRequestService.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class HireRequestsController : ControllerBase
{
    private readonly HireRequestService _service;

    public HireRequestsController(HireRequestService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<HireRequestDto>>>> GetAll([FromQuery] string? status, [FromQuery] int? projectId)
    {
        var data = await _service.GetAllAsync(status, projectId);
        return Ok(ApiResponse<List<HireRequestDto>>.SuccessResponse(data));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<HireRequestDto>>> Create([FromBody] CreateHireRequestDto request)
    {
        var isGm = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "GM");
        if (!isGm)
            return StatusCode(403, ApiResponse<HireRequestDto>.ErrorResponse("Only GM can create hire requests"));

        var actor = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value ?? "GM001";
        var data = await _service.CreateAsync(request, actor);

        return Ok(ApiResponse<HireRequestDto>.SuccessResponse(data, "Hire request created"));
    }

    [HttpPost("{id}/start")]
    public async Task<ActionResult<ApiResponse<HireRequestDto>>> Start(int id)
    {
        var isHr = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "HR");
        if (!isHr)
            return StatusCode(403, ApiResponse<HireRequestDto>.ErrorResponse("Only HR can start hire requests"));

        var actorUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "HR";
        var (success, error, statusCode, data) = await _service.StartAsync(id, actorUserId);

        if (!success)
            return StatusCode(statusCode, ApiResponse<HireRequestDto>.ErrorResponse(error!));

        return Ok(ApiResponse<HireRequestDto>.SuccessResponse(data!, "Hire request started"));
    }

    [HttpPost("{id}/fulfill")]
    public async Task<ActionResult<ApiResponse<HireRequestDto>>> Fulfill(int id, [FromBody] UpdateHireRequestStatusDto request)
    {
        var isHr = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "HR");
        var isMarketing = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "Marketing");

        // Pre-check: need to verify role access based on the request type
        // Authorization details: HR for regular, Marketing for Timeline Edit Request
        if (!isHr && !isMarketing)
            return StatusCode(403, ApiResponse<HireRequestDto>.ErrorResponse("Unauthorized to fulfill this request"));

        var actorUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value
            ?? (isMarketing ? "Marketing" : "HR");

        var (success, error, statusCode, data) = await _service.FulfillAsync(id, request, actorUserId);

        if (!success)
            return StatusCode(statusCode, ApiResponse<HireRequestDto>.ErrorResponse(error!));

        return Ok(ApiResponse<HireRequestDto>.SuccessResponse(data!, "Hire request fulfilled"));
    }

    [HttpPost("{id}/decline")]
    public async Task<ActionResult<ApiResponse<HireRequestDto>>> Decline(int id, [FromBody] UpdateHireRequestStatusDto request)
    {
        var isHr = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "HR");
        var isMarketing = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "Marketing");

        if (!isHr && !isMarketing)
            return StatusCode(403, ApiResponse<HireRequestDto>.ErrorResponse("Unauthorized to decline this request"));

        var actorUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value
            ?? (isMarketing ? "Marketing" : "HR");

        var (success, error, statusCode, data) = await _service.DeclineAsync(id, request, actorUserId);

        if (!success)
            return StatusCode(statusCode, ApiResponse<HireRequestDto>.ErrorResponse(error!));

        return Ok(ApiResponse<HireRequestDto>.SuccessResponse(data!, "Hire request declined"));
    }

    [HttpPost("{id}/status")]
    public async Task<ActionResult<ApiResponse<HireRequestDto>>> UpdateStatus(int id, [FromBody] UpdateHireRequestStatusDto request)
    {
        var isHr = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "HR");
        if (!isHr)
            return StatusCode(403, ApiResponse<HireRequestDto>.ErrorResponse("Only HR can update recruitment status"));

        var actorUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value
            ?? "HR";

        var (success, error, statusCode, data) = await _service.UpdateStatusAsync(id, request, actorUserId);

        if (!success)
            return StatusCode(statusCode, ApiResponse<HireRequestDto>.ErrorResponse(error!));

        return Ok(ApiResponse<HireRequestDto>.SuccessResponse(data!, "Recruitment status updated"));
    }
}
