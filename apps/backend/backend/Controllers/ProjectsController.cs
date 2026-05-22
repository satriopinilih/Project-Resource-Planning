using System.Security.Claims;
using backend.Services;
using Contracts.DTOs.Common;
using Contracts.DTOs.Project;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>
/// Handles project CRUD, member assignment, and status updates.
/// All endpoints require authentication.
/// Controller is thin — all DB logic lives in ProjectService.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProjectsController : ControllerBase
{
    private readonly ProjectService _service;

    public ProjectsController(ProjectService service)
    {
        _service = service;
    }

    private string? CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ??
        User.FindFirstValue("sub");

    private bool IsPM =>
        User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "PM");

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ProjectDto>>>> GetAll([FromQuery] string? status)
    {
        var data = await _service.GetAllAsync(status, CurrentUserId, IsPM);
        return Ok(ApiResponse<List<ProjectDto>>.SuccessResponse(data));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<ProjectDto>>> GetById(int id)
    {
        var (success, error, statusCode, data) = await _service.GetByIdAsync(id, CurrentUserId, IsPM);

        if (!success)
        {
            if (statusCode == 403) return Forbid();
            return StatusCode(statusCode, ApiResponse<ProjectDto>.ErrorResponse(error!));
        }

        return Ok(ApiResponse<ProjectDto>.SuccessResponse(data!));
    }

    [HttpPost("mark-read/{id}")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var userId = CurrentUserId;
        if (userId == null)
            return Unauthorized();

        var (success, error, statusCode) = await _service.MarkAsReadAsync(id, userId);

        if (!success)
            return StatusCode(statusCode, ApiResponse<string>.ErrorResponse(error!));

        return Ok(ApiResponse<string>.SuccessResponse("Notification marked as read"));
    }

    [HttpPost]
    public async Task<IActionResult> CreateProject([FromBody] CreateProjectRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var (success, error, statusCode, data) = await _service.CreateAsync(request);

        if (!success)
            return StatusCode(statusCode, ApiResponse<string>.ErrorResponse(error!));

        return CreatedAtAction(nameof(GetById), new { id = data!.ProjectId },
            ApiResponse<ProjectDto>.SuccessResponse(data));
    }

    [HttpPost("{id}/assign")]
    public async Task<IActionResult> AssignMember(int id, [FromBody] AssignMemberRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var (success, error, statusCode, data) = await _service.AssignMemberAsync(id, request);

        if (!success)
            return StatusCode(statusCode, ApiResponse<string>.ErrorResponse(error!));

        return Ok(ApiResponse<ProjectDto>.SuccessResponse(data!, "Member assigned successfully"));
    }

    [HttpDelete("{id}/assign/{userId}")]
    public async Task<IActionResult> UnassignMember(int id, string userId)
    {
        var (success, error, statusCode) = await _service.UnassignMemberAsync(id, userId);

        if (!success)
            return StatusCode(statusCode, ApiResponse<string>.ErrorResponse(error!));

        return Ok(ApiResponse<string>.SuccessResponse("Member removed from project"));
    }

    [HttpPatch("{id}/roles/{roleId}/count")]
    public async Task<IActionResult> UpdateRoleCount(int id, int roleId, [FromBody] UpdateRoleCountRequest request)
    {
        var (success, error, statusCode, data) = await _service.UpdateRoleCountAsync(id, roleId, request.NewCount);

        if (!success)
            return StatusCode(statusCode, ApiResponse<string>.ErrorResponse(error!));

        return Ok(ApiResponse<ProjectDto>.SuccessResponse(data!));
    }

    /// <summary>
    /// POST /api/projects/{id}/roles
    /// Allows the GM to add a new required role to an existing project.
    /// Marketing sets roles during project creation; GM can add more here.
    /// </summary>
    [HttpPost("{id}/roles")]
    public async Task<IActionResult> AddRequiredRole(int id, [FromBody] AddRequiredRoleRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var (success, error, statusCode, data) = await _service.AddRequiredRoleAsync(id, request);

        if (!success)
            return StatusCode(statusCode, ApiResponse<string>.ErrorResponse(error!));

        return StatusCode(201, ApiResponse<ProjectDto>.SuccessResponse(data!, "Role added successfully"));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProject(int id, [FromBody] UpdateProjectRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var (success, error, statusCode, data) = await _service.UpdateAsync(id, request, CurrentUserId);

        if (!success)
            return StatusCode(statusCode, ApiResponse<string>.ErrorResponse(error!));

        return Ok(ApiResponse<ProjectDto>.SuccessResponse(data!));
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateProjectStatus(int id, [FromBody] UpdateProjectStatusRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var (success, error, statusCode, data) = await _service.UpdateStatusAsync(id, request, CurrentUserId);

        if (!success)
            return StatusCode(statusCode, ApiResponse<ProjectDto>.ErrorResponse(error!));

        return Ok(ApiResponse<ProjectDto>.SuccessResponse(data!));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProject(int id)
    {
        var (success, error, statusCode) = await _service.DeleteAsync(id);

        if (!success)
        {
            if (statusCode == 404)
                return NotFound(ApiResponse<ProjectDto>.ErrorResponse(error!));
            return StatusCode(statusCode, ApiResponse<string>.ErrorResponse(error!));
        }

        return Ok(ApiResponse<string>.SuccessResponse("Project deleted successfully"));
    }

    [HttpPost("{id}/swap-member")]
    public async Task<IActionResult> SwapMember(int id, [FromBody] SwapMemberRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var (success, error, statusCode, data) = await _service.SwapMemberAsync(id, request);

        if (!success)
            return StatusCode(statusCode, ApiResponse<string>.ErrorResponse(error!));

        return Ok(ApiResponse<ProjectDto>.SuccessResponse(data!));
    }
}
