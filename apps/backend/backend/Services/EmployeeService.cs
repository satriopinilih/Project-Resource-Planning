using System.Security.Claims;
using Commons.Enums;
using Contracts.DTOs.Common;
using Contracts.DTOs.User;
using Entities;
using Entities.Entities;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public class EmployeeService
{
    private readonly ApplicationDbContext _db;

    public EmployeeService(ApplicationDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Retrieves all staff employees, optionally filtered by search term and scoped by PM projects.
    /// Uses AsNoTracking since this is a read-only display query.
    /// </summary>
    public async Task<List<UserDto>> GetAllAsync(string? search, string? currentUserId, bool isPM)
    {
        var query = _db.Users
            .AsNoTracking()
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

        if (isPM && currentUserId is not null)
        {
            var pmProjectIds = await _db.UserProjects
                .AsNoTracking()
                .Where(up => up.UserId == currentUserId)
                .Select(up => up.ProjectId)
                .ToListAsync();

            query = query.Where(u =>
                u.UserProjects.Any(up => pmProjectIds.Contains(up.ProjectId)));
        }

        // Selalu sembunyikan user bertipe manajerial (PM, GM, HR) — fokus ke staff saja
        query = query.Where(u =>
            !u.UserRoles.Any(r =>
                r.Role.RoleName == RoleName.PM ||
                r.Role.RoleName == RoleName.GM ||
                r.Role.RoleName == RoleName.HR));

        var users = await query.OrderBy(u => u.UserName).ToListAsync();
        return users.Select(MapToUserDto).ToList();
    }

    /// <summary>
    /// Retrieves a single employee by ID. Uses AsNoTracking for read-only display.
    /// </summary>
    public async Task<UserDto?> GetByIdAsync(string id)
    {
        var user = await _db.Users
            .AsNoTracking()
            .Include(u => u.Department)
            .Include(u => u.UserSkills).ThenInclude(us => us.Skill)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.UserStaffRoles).ThenInclude(usr => usr.StaffRole)
            .Include(u => u.UserProjects).ThenInclude(up => up.Project)
            .FirstOrDefaultAsync(u => u.UserId == id);

        return user is null ? null : MapToUserDto(user);
    }

    /// <summary>
    /// Retrieves employees with contracts expiring within the given number of days.
    /// Uses AsNoTracking for read-only display.
    /// </summary>
    public async Task<List<UserDto>> GetExpiringAsync(int days)
    {
        var now = DateTime.UtcNow.Date;
        var threshold = now.AddDays(days);

        var users = await _db.Users
            .AsNoTracking()
            .Include(u => u.Department)
            .Include(u => u.UserSkills).ThenInclude(us => us.Skill)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.UserStaffRoles).ThenInclude(usr => usr.StaffRole)
            .Include(u => u.UserProjects).ThenInclude(up => up.Project)
            .Where(u => u.ContractEnd.Date >= now && u.ContractEnd.Date <= threshold)
            .OrderBy(u => u.ContractEnd)
            .ToListAsync();

        return users.Select(MapToUserDto).ToList();
    }

    /// <summary>
    /// Retrieves form options (departments, skills, roles, staff roles) for the employee creation form.
    /// Uses AsNoTracking since all lookups are read-only.
    /// </summary>
    public async Task<EmployeeFormOptionsDto> GetFormOptionsAsync()
    {
        var departments = await _db.Departments
            .AsNoTracking()
            .OrderBy(d => d.DepartmentName)
            .Select(d => new LookupItemDto
            {
                Id = d.DepartementID,
                Name = d.DepartmentName
            })
            .ToListAsync();

        var skills = await _db.Skills
            .AsNoTracking()
            .OrderBy(s => s.SkillName)
            .Select(s => new LookupItemDto
            {
                Id = s.SkillID,
                Name = s.SkillName
            })
            .ToListAsync();

        var roles = await _db.Roles
            .AsNoTracking()
            .OrderBy(r => r.RoleId)
            .Select(r => new LookupItemDto
            {
                Id = r.RoleId,
                Name = r.RoleName.ToString()
            })
            .ToListAsync();

        var staffRoles = await _db.StaffRoles
            .AsNoTracking()
            .OrderBy(sr => sr.RoleName)
            .Select(sr => new LookupItemDto
            {
                Id = sr.StaffRoleId,
                Name = sr.RoleName
            })
            .ToListAsync();

        return new EmployeeFormOptionsDto
        {
            Departments = departments,
            Skills = skills,
            Roles = roles,
            StaffRoles = staffRoles
        };
    }

    public async Task<string> GetNextUserIdAsync(int? staffRoleId)
    {
        var prefix = "EMP";

        if (staffRoleId.HasValue)
        {
            var staffRoleName = await _db.StaffRoles
                .AsNoTracking()
                .Where(sr => sr.StaffRoleId == staffRoleId.Value)
                .Select(sr => sr.RoleName)
                .FirstOrDefaultAsync();

            if (string.Equals(staffRoleName, "PM", StringComparison.OrdinalIgnoreCase))
            {
                prefix = "PM";
            }
        }

        var existingIds = await _db.Users
            .AsNoTracking()
            .Where(u => u.UserId.StartsWith(prefix))
            .Select(u => u.UserId)
            .ToListAsync();

        var maxNumber = 0;
        foreach (var id in existingIds)
        {
            if (id.Length <= prefix.Length)
                continue;

            var suffix = id[prefix.Length..];
            if (int.TryParse(suffix, out var parsed) && parsed > maxNumber)
            {
                maxNumber = parsed;
            }
        }

        return $"{prefix}{(maxNumber + 1):D3}";
    }

    /// <summary>
    /// Creates a new employee with associated skills, roles, and staff roles.
    /// Uses AddRange instead of looped Add calls for batch efficiency.
    /// </summary>
    public async Task<(bool Success, string? Error, CreateUserResultDto? Data)> CreateAsync(CreateUserDto request, string actorUserId)
    {
        var normalizedEmail = request.Email.Trim().ToLower();
        var exists = await _db.Users.AnyAsync(u =>
            u.UserId == request.UserId ||
            u.Email.ToLower() == normalizedEmail);
        if (exists)
        {
            return (false, "UserId or Email already exists", null);
        }

        var department = await _db.Departments.FirstOrDefaultAsync(d => d.DepartementID == request.DepartmentId);
        if (department is null)
        {
            return (false, "Department not found", null);
        }

        var temporaryPassword = AuthService.BuildTemporaryPassword(request.UserName, request.UserId);

        var user = new User
        {
            UserId = request.UserId,
            UserName = request.UserName,
            Email = normalizedEmail,
            Password = temporaryPassword,
            DepartmentId = request.DepartmentId,
            EmployeeType = request.EmployeeType,
            ExperienceYears = request.ExperienceYears,
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

        // Use AddRange instead of looping .Add() for batch efficiency
        if (request.SkillIds.Any())
        {
            var validSkillIds = await _db.Skills
                .Where(s => request.SkillIds.Contains(s.SkillID))
                .Select(s => s.SkillID)
                .ToListAsync();

            var userSkills = validSkillIds.Select(sid => new UserSkill { UserId = user.UserId, SkillId = sid }).ToList();
            _db.UserSkills.AddRange(userSkills);
        }

        if (request.RoleIds.Any())
        {
            var validRoleIds = await _db.Roles
                .Where(r => request.RoleIds.Contains(r.RoleId))
                .Select(r => r.RoleId)
                .ToListAsync();

            var userRoles = validRoleIds.Select(rid => new UserRole { UserId = user.UserId, RoleId = rid }).ToList();
            _db.UserRoles.AddRange(userRoles);
        }

        if (request.StaffRoleIds.Any())
        {
            var validStaffRoleIds = await _db.StaffRoles
                .Where(sr => request.StaffRoleIds.Contains(sr.StaffRoleId))
                .Select(sr => sr.StaffRoleId)
                .ToListAsync();

            var userStaffRoles = validStaffRoleIds.Select(srid => new UserStaffRole { UserId = user.UserId, StaffRoleId = srid }).ToList();
            _db.UserStaffRoles.AddRange(userStaffRoles);
        }

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            var detail = ex.InnerException?.Message ?? ex.Message;
            return (false, $"Failed to create employee: {detail}", null);
        }

        var created = await _db.Users
            .AsNoTracking()
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

        return (true, null, result);
    }

    /// <summary>
    /// Resets an employee's password to a temporary default. Only HR can perform this action.
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode, object? Data)> ResetPasswordAsync(string id, string actorUserId)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == id);
        if (user is null)
        {
            return (false, "Employee not found", 404, null);
        }

        var temporaryPassword = AuthService.BuildTemporaryPassword(user.UserName, user.UserId);
        user.Password = temporaryPassword;
        user.UpdatedAt = DateTime.UtcNow;
        user.UpdatedBy = actorUserId;

        await _db.SaveChangesAsync();

        return (true, null, 200, new
        {
            temporaryPassword,
            mustChangePassword = true
        });
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
            ExperienceYears = u.ExperienceYears,
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
                ClientOrganization = p.Project?.ClientOrganization ?? string.Empty,
                RoleInProject = p.RoleInProject,
                StartDate = p.StartDate ?? p.Project?.EstimatedStartDate ?? DateTime.MinValue,
                EndDate = p.EndDate ?? p.Project?.EstimatedEndDate,
                Status = p.Status
            }).ToList()
        };
    }
}
