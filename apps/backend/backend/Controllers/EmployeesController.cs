using Commons.Enums;
using Contracts.DTOs.Common;
using Contracts.DTOs.User;
using Entities;
using Entities.Entities;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmployeesController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public EmployeesController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<UserDto>>>> GetAll([FromQuery] string? search)
    {
        var query = _db.Users
            .Include(u => u.Department)
            .Include(u => u.UserSkills).ThenInclude(us => us.Skill)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.UserStaffRoles).ThenInclude(usr => usr.StaffRole)
            .Include(u => u.UserProjects).ThenInclude(up => up.Project)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(u =>
                u.UserId.Contains(search) ||
                u.UserName.Contains(search) ||
                u.Email.Contains(search));
        }

        var users = await query.OrderBy(u => u.UserName).ToListAsync();
        var data = users.Select(MapToUserDto).ToList();

        return Ok(ApiResponse<List<UserDto>>.SuccessResponse(data));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<UserDto>>> GetById(string id)
    {
        var user = await _db.Users
            .Include(u => u.Department)
            .Include(u => u.UserSkills).ThenInclude(us => us.Skill)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.UserStaffRoles).ThenInclude(usr => usr.StaffRole)
            .Include(u => u.UserProjects).ThenInclude(up => up.Project)
            .FirstOrDefaultAsync(u => u.UserId == id);

        if (user is null)
        {
            return NotFound(ApiResponse<UserDto>.ErrorResponse("Employee not found"));
        }

        return Ok(ApiResponse<UserDto>.SuccessResponse(MapToUserDto(user)));
    }

    [HttpGet("expiring")]
    public async Task<ActionResult<ApiResponse<List<UserDto>>>> GetExpiring([FromQuery] int days = 60)
    {
        var now = DateTime.UtcNow.Date;
        var threshold = now.AddDays(days);

        var users = await _db.Users
            .Include(u => u.Department)
            .Include(u => u.UserSkills).ThenInclude(us => us.Skill)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.UserStaffRoles).ThenInclude(usr => usr.StaffRole)
            .Include(u => u.UserProjects).ThenInclude(up => up.Project)
            .Where(u => u.ContractEnd.Date >= now && u.ContractEnd.Date <= threshold)
            .OrderBy(u => u.ContractEnd)
            .ToListAsync();

        var data = users.Select(MapToUserDto).ToList();
        return Ok(ApiResponse<List<UserDto>>.SuccessResponse(data));
    }

    [HttpGet("form-options")]
    public async Task<ActionResult<ApiResponse<EmployeeFormOptionsDto>>> GetFormOptions()
    {
        var departments = await _db.Departments
            .OrderBy(d => d.DepartmentName)
            .Select(d => new LookupItemDto
            {
                Id = d.DepartementID,
                Name = d.DepartmentName
            })
            .ToListAsync();

        var skills = await _db.Skills
            .OrderBy(s => s.SkillName)
            .Select(s => new LookupItemDto
            {
                Id = s.SkillID,
                Name = s.SkillName
            })
            .ToListAsync();

        var roles = await _db.Roles
            .OrderBy(r => r.RoleId)
            .Select(r => new LookupItemDto
            {
                Id = r.RoleId,
                Name = r.RoleName.ToString()
            })
            .ToListAsync();

        var staffRoles = await _db.StaffRoles
            .OrderBy(sr => sr.RoleName)
            .Select(sr => new LookupItemDto
            {
                Id = sr.StaffRoleId,
                Name = sr.RoleName
            })
            .ToListAsync();

        var dto = new EmployeeFormOptionsDto
        {
            Departments = departments,
            Skills = skills,
            Roles = roles,
            StaffRoles = staffRoles
        };

        return Ok(ApiResponse<EmployeeFormOptionsDto>.SuccessResponse(dto));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<CreateUserResultDto>>> Create([FromBody] CreateUserDto request)
    {
        var actorUserId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                          ?? User.FindFirstValue(ClaimTypes.Name)
                          ?? "system";

        var normalizedEmail = request.Email.Trim().ToLower();
        var exists = await _db.Users.AnyAsync(u =>
            u.UserId == request.UserId ||
            u.Email.ToLower() == normalizedEmail);
        if (exists)
        {
            return BadRequest(ApiResponse<CreateUserResultDto>.ErrorResponse("UserId or Email already exists"));
        }

        var department = await _db.Departments.FirstOrDefaultAsync(d => d.DepartementID == request.DepartmentId);
        if (department is null)
        {
            return BadRequest(ApiResponse<CreateUserResultDto>.ErrorResponse("Department not found"));
        }

        var temporaryPassword = BuildTemporaryPassword(request.UserName, request.UserId);

        var user = new User
        {
            UserId = request.UserId,
            UserName = request.UserName,
            Email = normalizedEmail,
            Password = temporaryPassword,
            DepartmentId = request.DepartmentId,
            EmployeeType = request.EmployeeType,
            ExperienceLevel = request.ExperienceLevel,
            ContractStart = DateTime.SpecifyKind(request.ContractStart, DateTimeKind.Utc),
            ContractEnd = DateTime.SpecifyKind(request.ContractEnd, DateTimeKind.Utc),
            ContractStatus = request.ContractEnd.Date < DateTime.UtcNow.Date
                ? ContractStatus.Expired
                : (request.ContractEnd.Date <= DateTime.UtcNow.Date.AddDays(60) ? ContractStatus.ExpiringSoon : ContractStatus.Active),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = actorUserId,
            UpdatedBy = actorUserId
        };

        _db.Users.Add(user);

        if (request.SkillIds.Any())
        {
            var skills = await _db.Skills.Where(s => request.SkillIds.Contains(s.SkillID)).Select(s => s.SkillID).ToListAsync();
            foreach (var sid in skills)
            {
                _db.UserSkills.Add(new UserSkill { UserId = user.UserId, SkillId = sid });
            }
        }

        if (request.RoleIds.Any())
        {
            var roles = await _db.Roles.Where(r => request.RoleIds.Contains(r.RoleId)).Select(r => r.RoleId).ToListAsync();
            foreach (var rid in roles)
            {
                _db.UserRoles.Add(new UserRole { UserId = user.UserId, RoleId = rid });
            }
        }

        if (request.StaffRoleIds.Any())
        {
            var staffRoles = await _db.StaffRoles
                .Where(sr => request.StaffRoleIds.Contains(sr.StaffRoleId))
                .Select(sr => sr.StaffRoleId)
                .ToListAsync();

            foreach (var srid in staffRoles)
            {
                _db.UserStaffRoles.Add(new UserStaffRole { UserId = user.UserId, StaffRoleId = srid });
            }
        }

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            var detail = ex.InnerException?.Message ?? ex.Message;
            return BadRequest(ApiResponse<CreateUserResultDto>.ErrorResponse($"Failed to create employee: {detail}"));
        }

        var created = await _db.Users
            .Include(u => u.Department)
            .Include(u => u.UserSkills).ThenInclude(us => us.Skill)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.UserStaffRoles).ThenInclude(usr => usr.StaffRole)
            .Include(u => u.UserProjects).ThenInclude(up => up.Project)
            .FirstAsync(u => u.UserId == user.UserId);

        var result = new CreateUserResultDto
        {
            User = MapToUserDto(created),
            TemporaryPassword = temporaryPassword,
            MustChangePassword = true
        };

        return Ok(ApiResponse<CreateUserResultDto>.SuccessResponse(result, "Employee created"));
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

    private static UserDto MapToUserDto(User u)
    {
        var daysRemaining = (u.ContractEnd.Date - DateTime.UtcNow.Date).Days;

        return new UserDto
        {
            UserId = u.UserId,
            UserName = u.UserName,
            Email = u.Email,
            DepartmentId = u.DepartmentId,
            DepartmentName = u.Department?.DepartmentName ?? string.Empty,
            EmployeeType = u.EmployeeType,
            Role = u.UserStaffRoles.Select(x => x.StaffRole.RoleName).FirstOrDefault() ?? u.UserRoles.Select(x => x.Role.RoleName.ToString()).FirstOrDefault() ?? "Staff",
            ExperienceLevel = u.ExperienceLevel,
            ContractStart = u.ContractStart,
            ContractEnd = u.ContractEnd,
            ContractStatus = u.ContractStatus,
            DaysRemaining = daysRemaining,
            Skills = u.UserSkills.Select(s => s.Skill.SkillName).ToList(),
            Roles = u.UserRoles.Select(r => r.Role.RoleName.ToString()).ToList(),
            Projects = u.UserProjects.Select(p => new UserProjectDto
            {
                ProjectId = p.ProjectId,
                ProjectName = p.Project?.ProjectName ?? string.Empty,
                RoleInProject = p.RoleInProject,
                StartDate = p.StartDate ?? p.Project?.EstimatedStartDate ?? DateTime.MinValue,
                EndDate = p.EndDate ?? p.Project?.EstimatedEndDate
            }).ToList()
        };
    }
}
