using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.Services;
using Contracts.DTOs.Auth;
using Contracts.DTOs.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>
/// Handles authentication endpoints: login, change password, forgot password.
/// [Authorize] at class level — public endpoints are marked [AllowAnonymous].
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<LoginResponseDto>>> Login([FromBody] LoginDto request)
    {
        var (success, error, data) = await _authService.LoginAsync(request);

        if (!success)
            return Unauthorized(ApiResponse<LoginResponseDto>.ErrorResponse(error!));

        return Ok(ApiResponse<LoginResponseDto>.SuccessResponse(data!, "Login successful"));
    }

    [HttpPost("change-password")]
    public async Task<ActionResult<ApiResponse<object>>> ChangePassword([FromBody] ChangePasswordDto request)
    {
        var userId = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(ApiResponse<object>.ErrorResponse("Invalid token"));

        var (success, error, statusCode) = await _authService.ChangePasswordAsync(userId, request);

        if (!success)
            return StatusCode(statusCode, ApiResponse<object>.ErrorResponse(error!));

        return Ok(ApiResponse<object>.SuccessResponse(new { }, "Password changed successfully"));
    }

    [AllowAnonymous]
    [HttpPost("forgot-password")]
    public async Task<ActionResult<ApiResponse<object>>> ForgotPassword([FromBody] ForgotPasswordDto request)
    {
        var (success, error, statusCode) = await _authService.ForgotPasswordAsync(request);

        if (!success)
            return StatusCode(statusCode, ApiResponse<object>.ErrorResponse(error!));

        return Ok(ApiResponse<object>.SuccessResponse(new { }, "If the account exists, a reset email has been sent"));
    }
}
