using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Mail;
using System.Security.Claims;
using System.Text;
using Contracts.DTOs.Auth;
using Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace backend.Services;

public class AuthService
{
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _configuration;

    public AuthService(ApplicationDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    public async Task<(bool Success, string? Error, LoginResponseDto? Data)> LoginAsync(LoginDto request)
    {
        var user = await _db.Users
            .AsNoTracking()
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Email == request.Email || u.UserId == request.Email);

        if (user is null || user.Password != request.Password)
        {
            return (false, "Invalid email or password", null);
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

        return (true, null, response);
    }

    public async Task<(bool Success, string? Error, int StatusCode)> ChangePasswordAsync(string userId, ChangePasswordDto request)
    {
        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8)
        {
            return (false, "New password must be at least 8 characters", 400);
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId);
        if (user is null)
        {
            return (false, "User not found", 404);
        }

        if (user.Password != request.CurrentPassword)
        {
            return (false, "Current password is incorrect", 400);
        }

        user.Password = request.NewPassword;
        user.UpdatedAt = DateTime.UtcNow;
        user.UpdatedBy = userId;

        await _db.SaveChangesAsync();
        return (true, null, 200);
    }

    public async Task<(bool Success, string? Error, int StatusCode)> ForgotPasswordAsync(ForgotPasswordDto request)
    {
        var identifier = request.Identifier?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(identifier))
        {
            return (false, "Email or User ID is required", 400);
        }

        var normalizedIdentifier = identifier.ToLower();
        var user = await _db.Users.FirstOrDefaultAsync(u =>
            u.UserId.ToLower() == normalizedIdentifier ||
            u.Email.ToLower() == normalizedIdentifier);

        if (user is null)
        {
            // Return success to prevent user enumeration
            return (true, null, 200);
        }

        var temporaryPassword = BuildTemporaryPassword(user.UserName, user.UserId);

        var (sent, reason) = await TrySendResetEmail(user.Email, user.UserName, temporaryPassword);
        if (!sent)
        {
            return (false, $"Failed to send reset email: {reason}", 400);
        }

        user.Password = temporaryPassword;
        user.UpdatedAt = DateTime.UtcNow;
        user.UpdatedBy = user.UserId;
        await _db.SaveChangesAsync();

        return (true, null, 200);
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

    public static string BuildTemporaryPassword(string userName, string userId)
    {
        var firstName = (userName ?? string.Empty).Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "User";
        var digitPart = new string((userId ?? string.Empty).Where(char.IsDigit).ToArray());
        if (string.IsNullOrWhiteSpace(digitPart))
        {
            digitPart = "001";
        }

        return $"{firstName}@{digitPart}";
    }

    private async Task<(bool Sent, string Reason)> TrySendResetEmail(string toEmail, string userName, string temporaryPassword)
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
            return (false, "SMTP is not configured. Set Smtp.Host, Smtp.From, Smtp.Username, and Smtp.Password in appsettings.");
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
            return (true, string.Empty);
        }
        catch (Exception ex)
        {
            return (false, ex.Message);
        }
    }
}
