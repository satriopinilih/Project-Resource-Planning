using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading.Tasks;
using backend.Services;
using Commons.Enums;
using Contracts.DTOs.Auth;
using Contracts.DTOs.Common;
using Entities;
using Entities.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SsoController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly AuthService _authService;
    private readonly IConfiguration _configuration;

    public SsoController(ApplicationDbContext db, AuthService authService, IConfiguration configuration)
    {
        _db = db;
        _authService = authService;
        _configuration = configuration;
    }

    public class SsoLoginRequest
    {
        public string Ticket { get; set; } = string.Empty;
    }

    public class AisExchangeResultDto
    {
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public string? Role { get; set; }
        public string? Position { get; set; }
        public string AccessToken { get; set; } = string.Empty;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<LoginResponseDto>>> SsoLogin([FromBody] SsoLoginRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Ticket))
        {
            return BadRequest(ApiResponse<LoginResponseDto>.ErrorResponse("Invalid ticket parameter."));
        }

        // 1. Exchange ticket with AIS BE
        var aisBaseUrl = _configuration["AisConfig:BaseUrl"] ?? "http://localhost:35590";
        var exchangeUrl = $"{aisBaseUrl.TrimEnd('/')}/api/v1/sso/exchange-ticket";

        AisExchangeResultDto? aisData = null;
        try
        {
            // Bypass SSL for local development
            var handler = new HttpClientHandler
            {
                ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => true
            };
            using var client = new HttpClient(handler);
            var response = await client.PostAsJsonAsync(exchangeUrl, new { TicketId = request.Ticket });
            if (!response.IsSuccessStatusCode)
            {
                var errorMsg = await response.Content.ReadAsStringAsync();
                return BadRequest(ApiResponse<LoginResponseDto>.ErrorResponse($"Ticket exchange failed: {errorMsg}"));
            }
            aisData = await response.Content.ReadFromJsonAsync<AisExchangeResultDto>();
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<LoginResponseDto>.ErrorResponse($"Failed to connect to AIS: {ex.Message}"));
        }

        if (aisData == null || string.IsNullOrEmpty(aisData.Email))
        {
            return BadRequest(ApiResponse<LoginResponseDto>.ErrorResponse("Failed to retrieve user data from AIS."));
        }

        // 2. Validate Keycloak Access Token against Keycloak
        var keycloakUrl = _configuration["KeycloakConfig:BaseUrl"];
        var realm = _configuration["KeycloakConfig:Realm"];
        if (string.IsNullOrEmpty(keycloakUrl) || string.IsNullOrEmpty(realm))
        {
            return BadRequest(ApiResponse<LoginResponseDto>.ErrorResponse("Keycloak configuration is missing or incomplete."));
        }
        var userinfoUrl = $"{keycloakUrl.TrimEnd('/')}/realms/{realm}/protocol/openid-connect/userinfo";

        try
        {
            var handler = new HttpClientHandler
            {
                ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => true
            };
            using var client = new HttpClient(handler);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", aisData.AccessToken);
            var userInfoResponse = await client.GetAsync(userinfoUrl);
            if (!userInfoResponse.IsSuccessStatusCode)
            {
                return BadRequest(ApiResponse<LoginResponseDto>.ErrorResponse("Invalid or expired Keycloak session."));
            }
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<LoginResponseDto>.ErrorResponse($"Failed to validate token with Keycloak: {ex.Message}"));
        }

        // 3. Database Synchronization in PRP
        var user = await _db.Users
            .Include(u => u.UserRoles)
            .Include(u => u.UserStaffRoles)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == aisData.Email.ToLower());

        // Select default department
        var department = await _db.Departments.FirstOrDefaultAsync();
        if (department == null)
        {
            department = new Department
            {
                DepartmentName = "Engineering",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = "SSO",
                UpdatedBy = "SSO"
            };
            _db.Departments.Add(department);
        }

        // Map AIS Role & Position to PRP RoleName
        var roleLower = (aisData.Role ?? "").ToLowerInvariant().Replace(" ", "").Replace("-", "");
        var positionLower = (aisData.Position ?? "").ToLowerInvariant().Replace(" ", "").Replace("-", "");

        var mappedRole = RoleName.Staff;
        if (roleLower == "admin" || roleLower == "management")
        {
            mappedRole = RoleName.GM;
        }
        else if (roleLower == "humanresource" || roleLower == "humancapital")
        {
            mappedRole = RoleName.HR;
        }
        else if (roleLower == "business" || roleLower == "marketing")
        {
            mappedRole = RoleName.Marketing;
        }
        else if (positionLower.Contains("pm") || positionLower.Contains("projectmanager"))
        {
            mappedRole = RoleName.PM;
        }

        // Find System Role ID in PRP DB
        var roleObj = await _db.Roles.FirstOrDefaultAsync(r => r.RoleName == mappedRole);
        if (roleObj == null)
        {
            roleObj = new Role { RoleName = mappedRole };
            _db.Roles.Add(roleObj);
        }

        // Map AIS Position to StaffRole name
        var staffRoleName = "Senior Dev";
        if (!string.IsNullOrEmpty(positionLower))
        {
            if (positionLower.Contains("pm") || positionLower.Contains("projectmanager"))
            {
                staffRoleName = "PM";
            }
            else if (positionLower.Contains("ba") || positionLower.Contains("analyst") || positionLower.Contains("businessanalyst"))
            {
                if (positionLower.Contains("junior") || positionLower.Contains("internship") || positionLower.Contains("staff"))
                {
                    staffRoleName = "Junior BA";
                }
                else
                {
                    staffRoleName = "Senior BA";
                }
            }
            else if (positionLower.Contains("architect"))
            {
                staffRoleName = "Architect";
            }
            else if (positionLower.Contains("developer") || positionLower.Contains("engineer") || positionLower.Contains("programmer") || positionLower.Contains("dev"))
            {
                if (positionLower.Contains("junior") || positionLower.Contains("internship") || positionLower.Contains("staff"))
                {
                    staffRoleName = "Junior Dev";
                }
                else
                {
                    staffRoleName = "Senior Dev";
                }
            }
        }

        // Find Staff Role ID in PRP DB
        var staffRoleObj = await _db.StaffRoles.FirstOrDefaultAsync(sr => sr.RoleName.ToLower() == staffRoleName.ToLower());
        if (staffRoleObj == null)
        {
            staffRoleObj = new StaffRole { RoleName = staffRoleName };
            _db.StaffRoles.Add(staffRoleObj);
        }

        if (user == null)
        {
            // Provision new user
            user = new User
            {
                UserId = aisData.EmployeeId,
                UserName = aisData.FullName,
                Email = aisData.Email,
                Password = Guid.NewGuid().ToString(), // Placeholder password since it's SSO-based
                Department = department,
                EmployeeType = EmployeeType.Permanent,
                ExperienceYears = 0,
                ContractStart = DateTime.UtcNow,
                ContractEnd = DateTime.UtcNow.AddYears(5),
                ContractStatus = ContractStatus.Active,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = "SSO",
                UpdatedBy = "SSO"
            };
            _db.Users.Add(user);

            // Assign System Role
            var userRole = new UserRole
            {
                UserId = user.UserId,
                Role = roleObj
            };
            _db.UserRoles.Add(userRole);

            // Assign Staff Role (display role)
            var userStaffRole = new UserStaffRole
            {
                UserId = user.UserId,
                StaffRole = staffRoleObj
            };
            _db.UserStaffRoles.Add(userStaffRole);

            await _db.SaveChangesAsync();
        }
        else
        {
            // Update existing user roles/details
            user.UserName = aisData.FullName;
            user.UpdatedAt = DateTime.UtcNow;
            user.UpdatedBy = "SSO";

            // Update System Roles
            _db.UserRoles.RemoveRange(user.UserRoles);
            var newUserRole = new UserRole
            {
                UserId = user.UserId,
                Role = roleObj
            };
            _db.UserRoles.Add(newUserRole);

            // Update Staff Roles
            _db.UserStaffRoles.RemoveRange(user.UserStaffRoles);
            var newUserStaffRole = new UserStaffRole
            {
                UserId = user.UserId,
                StaffRole = staffRoleObj
            };
            _db.UserStaffRoles.Add(newUserStaffRole);

            await _db.SaveChangesAsync();
        }

        // 4. Generate local JWT token for PRP BE
        var rolesList = new List<string> { mappedRole.ToString() };
        var token = _authService.GenerateJwtToken(user.UserId, user.Email, user.UserName, rolesList);

        var loginResponseDto = new LoginResponseDto
        {
            Token = token,
            UserId = user.UserId,
            UserName = user.UserName,
            Email = user.Email,
            Roles = rolesList
        };

        return Ok(ApiResponse<LoginResponseDto>.SuccessResponse(loginResponseDto, "SSO login successful"));
    }
}
