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
}
