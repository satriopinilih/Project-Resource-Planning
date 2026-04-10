using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Mail;
using System.Security.Claims;
using System.Text;
using Contracts.DTOs.Auth;
using Contracts.DTOs.Common;
using Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _configuration;

    public AuthController(ApplicationDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<LoginResponseDto>>> Login([FromBody] LoginDto request)
    {
        var user = await _db.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Email == request.Email || u.UserId == request.Email);

        if (user is null || user.Password != request.Password)
        {
            return Unauthorized(ApiResponse<LoginResponseDto>.ErrorResponse("Invalid email or password"));
        }

        var roles = user.UserRoles.Select(r => r.Role.RoleName.ToString()).ToList();
        var token = GenerateJwtToken(user.UserId, user.Email, user.UserName, roles);

        var response = new LoginResponseDto
        {
            Token = token,
            UserId = user.UserId,
            UserName = user.UserName,
            Email = user.Email,
            Roles = roles,
            MustChangePassword = user.Password == BuildTemporaryPassword(user.UserName, user.UserId)
        };

        return Ok(ApiResponse<LoginResponseDto>.SuccessResponse(response, "Login successful"));
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<ActionResult<ApiResponse<object>>> ChangePassword([FromBody] ChangePasswordDto request)
    {
        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8)
        {
            return BadRequest(ApiResponse<object>.ErrorResponse("New password must be at least 8 characters"));
        }

        var userId = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(ApiResponse<object>.ErrorResponse("Invalid token"));
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId);
        if (user is null)
        {
            return NotFound(ApiResponse<object>.ErrorResponse("User not found"));
        }

        if (user.Password != request.CurrentPassword)
        {
            return BadRequest(ApiResponse<object>.ErrorResponse("Current password is incorrect"));
        }

        user.Password = request.NewPassword;
        user.UpdatedAt = DateTime.UtcNow;
        user.UpdatedBy = userId;

        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.SuccessResponse(new { }, "Password changed successfully"));
    }

    [HttpPost("forgot-password")]
    public async Task<ActionResult<ApiResponse<object>>> ForgotPassword([FromBody] ForgotPasswordDto request)
    {
        var identifier = request.Identifier?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(identifier))
        {
            return BadRequest(ApiResponse<object>.ErrorResponse("Email or User ID is required"));
        }

        var normalizedIdentifier = identifier.ToLower();
        var user = await _db.Users.FirstOrDefaultAsync(u =>
            u.UserId.ToLower() == normalizedIdentifier ||
            u.Email.ToLower() == normalizedIdentifier);

        if (user is null)
        {
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "If the account exists, a reset email has been sent"));
        }

        var temporaryPassword = BuildTemporaryPassword(user.UserName, user.UserId);
        user.Password = temporaryPassword;
        user.UpdatedAt = DateTime.UtcNow;
        user.UpdatedBy = user.UserId;
        await _db.SaveChangesAsync();

        await TrySendResetEmail(user.Email, user.UserName, temporaryPassword);

        return Ok(ApiResponse<object>.SuccessResponse(new { }, "Password reset sent to your email"));
    }

    private string GenerateJwtToken(string userId, string email, string userName, List<string> roles)
    {
        var jwt = _configuration.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(jwt["Secret"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId),
            new(JwtRegisteredClaimNames.Email, email),
            new(ClaimTypes.NameIdentifier, userId),
            new(ClaimTypes.Name, userName),
            new("name", userName),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        var token = new JwtSecurityToken(
            issuer: jwt["Issuer"],
            audience: jwt["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(12),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string BuildTemporaryPassword(string userName, string userId)
    {
        var firstName = (userName ?? string.Empty).Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "User";
        var digitPart = new string((userId ?? string.Empty).Where(char.IsDigit).ToArray());
        if (string.IsNullOrWhiteSpace(digitPart))
        {
            digitPart = "001";
        }

        return $"{firstName}@{digitPart}";
    }

    private async Task TrySendResetEmail(string toEmail, string userName, string temporaryPassword)
    {
        var smtp = _configuration.GetSection("Smtp");
        var host = smtp["Host"];
        var from = smtp["From"];
        var username = smtp["Username"];
        var password = smtp["Password"];
        var port = int.TryParse(smtp["Port"], out var parsedPort) ? parsedPort : 587;
        var enableSsl = bool.TryParse(smtp["EnableSsl"], out var parsedSsl) && parsedSsl;

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(from) || string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            return;
        }

        using var client = new SmtpClient(host, port)
        {
            EnableSsl = enableSsl,
            Credentials = new NetworkCredential(username, password)
        };

        using var mail = new MailMessage(from, toEmail)
        {
            Subject = "Resource Planning - Password Reset",
            Body = $"Hello {userName},\n\nYour temporary password is: {temporaryPassword}\nPlease login and change your password immediately from Settings.\n\nRegards,\nResource Planning System"
        };

        try
        {
            await client.SendMailAsync(mail);
        }
        catch
        {
            // Ignore SMTP failures to avoid exposing mail configuration details
        }
    }
}
