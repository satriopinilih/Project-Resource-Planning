using System.Security.Claims;
using backend.Services;
using Contracts.DTOs.Common;
using Contracts.DTOs.User;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>
/// Handles employee CRUD and lookup endpoints. All endpoints require authentication.
/// Controller is thin — all DB logic lives in EmployeeService.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EmployeesController : ControllerBase
{
    private readonly EmployeeService _service;

    public EmployeesController(EmployeeService service)
    {
        _service = service;
    }

    private string? CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ??
        User.FindFirstValue("sub");

    private bool IsPM =>
        User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "PM");

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<UserDto>>>> GetAll([FromQuery] string? search)
    {
        var data = await _service.GetAllAsync(search, CurrentUserId, IsPM);
        return Ok(ApiResponse<List<UserDto>>.SuccessResponse(data));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<UserDto>>> GetById(string id)
    {
        var data = await _service.GetByIdAsync(id);
        if (data is null)
            return NotFound(ApiResponse<UserDto>.ErrorResponse("Employee not found"));

        return Ok(ApiResponse<UserDto>.SuccessResponse(data));
    }

    [HttpGet("expiring")]
    public async Task<ActionResult<ApiResponse<List<UserDto>>>> GetExpiring([FromQuery] int days = 60)
    {
        var data = await _service.GetExpiringAsync(days);
        return Ok(ApiResponse<List<UserDto>>.SuccessResponse(data));
    }

    [HttpGet("form-options")]
    public async Task<ActionResult<ApiResponse<EmployeeFormOptionsDto>>> GetFormOptions()
    {
        var data = await _service.GetFormOptionsAsync();
        return Ok(ApiResponse<EmployeeFormOptionsDto>.SuccessResponse(data));
    }

    [HttpGet("next-user-id")]
    public async Task<ActionResult<ApiResponse<object>>> GetNextUserId([FromQuery] int? staffRoleId)
    {
        var userId = await _service.GetNextUserIdAsync(staffRoleId);
        return Ok(ApiResponse<object>.SuccessResponse(new { userId }));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<CreateUserResultDto>>> Create([FromBody] CreateUserDto request)
    {
        var actorUserId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                          ?? User.FindFirstValue(ClaimTypes.Name)
                          ?? "system";

        var (success, error, data) = await _service.CreateAsync(request, actorUserId);

        if (!success)
            return BadRequest(ApiResponse<CreateUserResultDto>.ErrorResponse(error!));

        return Ok(ApiResponse<CreateUserResultDto>.SuccessResponse(data!, "Employee created"));
    }

    [HttpPost("{id}/reset-password")]
    public async Task<ActionResult<ApiResponse<object>>> ResetPassword(string id)
    {
        var isHr = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "HR");
        if (!isHr)
            return StatusCode(403, ApiResponse<object>.ErrorResponse("Only HR can reset user passwords"));

        var actorUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "HR";
        var (success, error, statusCode, data) = await _service.ResetPasswordAsync(id, actorUserId);

        if (!success)
            return StatusCode(statusCode, ApiResponse<object>.ErrorResponse(error!));

        return Ok(ApiResponse<object>.SuccessResponse(data!, "Password has been reset to default temporary password"));
    }
    [HttpPut("{id}/skills")]
    public async Task<ActionResult<ApiResponse<UserDto>>> UpdateSkills(string id, [FromBody] UpdateEmployeeSkillsRequest request)
    {
        var isHrOrAdmin = User.Claims.Any(c => c.Type == ClaimTypes.Role && (c.Value == "HR" || c.Value == "GM"));
        if (!isHrOrAdmin && CurrentUserId != id)
        {
            return StatusCode(403, ApiResponse<UserDto>.ErrorResponse("You can only update your own skills"));
        }

        var actorUserId = CurrentUserId ?? "system";
        var (success, error, statusCode, data) = await _service.UpdateSkillsAsync(id, request.SkillIds, actorUserId);

        if (!success)
            return StatusCode(statusCode, ApiResponse<UserDto>.ErrorResponse(error!));

        return Ok(ApiResponse<UserDto>.SuccessResponse(data!, "Skills updated successfully"));
    }

    [HttpGet("{id}/notifications")]
    public async Task<ActionResult<ApiResponse<Contracts.DTOs.User.NotificationResponseDto>>> GetUnreadNotifications(string id)
    {
        var isHrOrAdmin = User.Claims.Any(c => c.Type == ClaimTypes.Role && (c.Value == "HR" || c.Value == "GM"));
        if (!isHrOrAdmin && CurrentUserId != id)
        {
            return StatusCode(403, ApiResponse<Contracts.DTOs.User.NotificationResponseDto>.ErrorResponse("You can only view your own notifications"));
        }

        var (success, error, statusCode, data) = await _service.GetUnreadNotificationsAsync(id);

        if (!success)
            return StatusCode(statusCode, ApiResponse<Contracts.DTOs.User.NotificationResponseDto>.ErrorResponse(error!));

        return Ok(ApiResponse<Contracts.DTOs.User.NotificationResponseDto>.SuccessResponse(data!));
    }
}
