using Commons.Enums;
using Contracts.DTOs.Common;
using Contracts.DTOs.User;
using Entities;
using Entities.Entities;
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

    [HttpPost]
    public async Task<ActionResult<ApiResponse<UserDto>>> Create([FromBody] CreateUserDto request)
    {
        var exists = await _db.Users.AnyAsync(u => u.UserId == request.UserId || u.Email == request.Email);
        if (exists)
        {
            return BadRequest(ApiResponse<UserDto>.ErrorResponse("UserId or Email already exists"));
        }

        var department = await _db.Departments.FirstOrDefaultAsync(d => d.DepartementID == request.DepartmentId);
        if (department is null)
        {
            return BadRequest(ApiResponse<UserDto>.ErrorResponse("Department not found"));
        }

        var user = new User
        {
            UserId = request.UserId,
            UserName = request.UserName,
            Email = request.Email,
            Password = request.Password,
            DepartmentId = request.DepartmentId,
            EmployeeType = request.EmployeeType,
            ExperienceLevel = request.ExperienceLevel,
            ContractStart = request.ContractStart,
            ContractEnd = request.ContractEnd,
            ContractStatus = request.ContractEnd.Date < DateTime.UtcNow.Date
                ? ContractStatus.Expired
                : (request.ContractEnd.Date <= DateTime.UtcNow.Date.AddDays(60) ? ContractStatus.ExpiringSoon : ContractStatus.Active),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = "system",
            UpdatedBy = "system"
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

        await _db.SaveChangesAsync();

        var created = await _db.Users
            .Include(u => u.Department)
            .Include(u => u.UserSkills).ThenInclude(us => us.Skill)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.UserStaffRoles).ThenInclude(usr => usr.StaffRole)
            .Include(u => u.UserProjects).ThenInclude(up => up.Project)
            .FirstAsync(u => u.UserId == user.UserId);

        return Ok(ApiResponse<UserDto>.SuccessResponse(MapToUserDto(created), "Employee created"));
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
                StartDate = p.Project?.EstimatedStartDate ?? DateTime.MinValue,
                EndDate = null
            }).ToList()
        };
    }
}
