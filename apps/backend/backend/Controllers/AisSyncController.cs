using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Commons.Enums;
using Contracts.DTOs.User;
using Entities;
using Entities.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AisSyncController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly IConfiguration _configuration;

        public AisSyncController(ApplicationDbContext db, IConfiguration configuration)
        {
            _db = db;
            _configuration = configuration;
        }

        [HttpPost("sync")]
        public async Task<IActionResult> SyncEmployee([FromBody] AisSyncEmployeeDto request)
        {
            // 1. ApiKey check
            if (!HttpContext.Request.Headers.TryGetValue("ApiKey", out var apiKeyHeader))
            {
                return Unauthorized("Headers must contain 'ApiKey' header.");
            }

            var configuredApiKey = _configuration["AisConfig:ApiKey"];
            if (string.IsNullOrEmpty(configuredApiKey) || apiKeyHeader != configuredApiKey)
            {
                return Unauthorized("Invalid ApiKey header.");
            }

            if (request == null || string.IsNullOrEmpty(request.EmployeeId))
            {
                return BadRequest("Invalid request payload.");
            }

            // 2. Map role and position
            var roleLower = (request.RoleName ?? "").ToLowerInvariant().Replace(" ", "").Replace("-", "");
            var positionLower = (request.PositionName ?? "").ToLowerInvariant().Replace(" ", "").Replace("-", "");

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
                await _db.SaveChangesAsync();
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
                await _db.SaveChangesAsync();
            }

            // 3. Sync User
            var user = await _db.Users
                .Include(u => u.UserRoles)
                .Include(u => u.UserStaffRoles)
                .FirstOrDefaultAsync(u => u.UserId == request.EmployeeId);

            var mappedEmployeeType = EmployeeType.ProfessionalServices;
            if (request.EmployeeTypeName?.ToLower().Contains("permanent") == true)
            {
                mappedEmployeeType = EmployeeType.Permanent;
            }

            var contractStart = request.JoinDate.HasValue 
                ? DateTime.SpecifyKind(request.JoinDate.Value, DateTimeKind.Utc) 
                : DateTime.UtcNow;
            var contractEnd = request.EndContractDate.HasValue 
                ? DateTime.SpecifyKind(request.EndContractDate.Value, DateTimeKind.Utc) 
                : DateTime.UtcNow.AddYears(5);
            var contractStatus = contractEnd.Date < DateTime.UtcNow.Date
                ? ContractStatus.Expired
                : (contractEnd.Date <= DateTime.UtcNow.Date.AddDays(60) ? ContractStatus.ExpiringSoon : ContractStatus.Active);

            if (user == null)
            {
                // Provision new user
                var department = await _db.Departments.FirstOrDefaultAsync();
                if (department == null)
                {
                    department = new Department
                    {
                        DepartmentName = "Engineering",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                        CreatedBy = "AIS Sync",
                        UpdatedBy = "AIS Sync"
                    };
                    _db.Departments.Add(department);
                    await _db.SaveChangesAsync();
                }

                user = new User
                {
                    UserId = request.EmployeeId,
                    UserName = request.FullName,
                    Email = request.Email.ToLower(),
                    Password = Guid.NewGuid().ToString(), // Placeholder password
                    DepartmentId = department.DepartementID,
                    EmployeeType = mappedEmployeeType,
                    ExperienceYears = 0,
                    ContractStart = contractStart,
                    ContractEnd = contractEnd,
                    ContractStatus = contractStatus,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    CreatedBy = "AIS Sync",
                    UpdatedBy = "AIS Sync"
                };
                _db.Users.Add(user);
                await _db.SaveChangesAsync();

                // Assign System Role
                var userRole = new UserRole
                {
                    UserId = user.UserId,
                    RoleId = roleObj.RoleId
                };
                _db.UserRoles.Add(userRole);

                // Assign Staff Role (display role)
                var userStaffRole = new UserStaffRole
                {
                    UserId = user.UserId,
                    StaffRoleId = staffRoleObj.StaffRoleId
                };
                _db.UserStaffRoles.Add(userStaffRole);

                await _db.SaveChangesAsync();
            }
            else
            {
                // Update existing user details
                user.UserName = request.FullName;
                user.Email = request.Email.ToLower();
                user.EmployeeType = mappedEmployeeType;
                user.ContractStart = contractStart;
                user.ContractEnd = contractEnd;
                user.ContractStatus = contractStatus;
                user.UpdatedAt = DateTime.UtcNow;
                user.UpdatedBy = "AIS Sync";

                // Update System Roles
                var existingUserRoles = await _db.UserRoles.Where(ur => ur.UserId == user.UserId).ToListAsync();
                _db.UserRoles.RemoveRange(existingUserRoles);

                var newUserRole = new UserRole
                {
                    UserId = user.UserId,
                    RoleId = roleObj.RoleId
                };
                _db.UserRoles.Add(newUserRole);

                // Update Staff Roles
                var existingUserStaffRoles = await _db.UserStaffRoles.Where(usr => usr.UserId == user.UserId).ToListAsync();
                _db.UserStaffRoles.RemoveRange(existingUserStaffRoles);

                var newUserStaffRole = new UserStaffRole
                {
                    UserId = user.UserId,
                    StaffRoleId = staffRoleObj.StaffRoleId
                };
                _db.UserStaffRoles.Add(newUserStaffRole);

                await _db.SaveChangesAsync();
            }

            return Ok(new { Success = true, Message = "Employee synced successfully." });
        }
    }
}
