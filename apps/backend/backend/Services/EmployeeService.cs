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
            .Include(u => u.UserExtensions)
            .Include(u => u.RoleHistories)
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
            .Include(u => u.UserExtensions)
            .Include(u => u.RoleHistories)
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
            .Include(u => u.UserExtensions)
            .Include(u => u.RoleHistories)
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
            MustChangePassword = false // Disabled for Keycloak integration
        };

        return (true, null, result);
    }

    /// <summary>
    /// Resets an employee's password to a temporary default. Only HR can perform this action.
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode, object? Data)> ResetPasswordAsync(string id, string actorUserId)
    {
        // Reset password is disabled as passwords are managed by Keycloak.
        return await Task.FromResult<(bool, string?, int, object?)>((false, "Password reset is disabled as passwords are managed by Keycloak.", 400, null));
    }

    /// <summary>
    /// Updates the skills for a specific employee.
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode, UserDto? Data)> UpdateSkillsAsync(string id, List<int> skillIds, int? experienceYears, string actorUserId)
    {
        var user = await _db.Users
            .Include(u => u.UserSkills)
            .Include(u => u.Department)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.UserStaffRoles).ThenInclude(usr => usr.StaffRole)
            .Include(u => u.UserProjects).ThenInclude(up => up.Project)
            .FirstOrDefaultAsync(u => u.UserId == id);

        if (user is null)
        {
            return (false, "Employee not found", 404, null);
        }

        // Validate that all skills exist
        if (skillIds.Any())
        {
            var validSkillCount = await _db.Skills.CountAsync(s => skillIds.Contains(s.SkillID));
            if (validSkillCount != skillIds.Count)
            {
                return (false, "One or more selected skills are invalid", 400, null);
            }
        }

        // Remove old skills
        _db.UserSkills.RemoveRange(user.UserSkills);

        // Add new skills
        foreach (var skillId in skillIds)
        {
            user.UserSkills.Add(new UserSkill
            {
                UserId = id,
                SkillId = skillId
            });
        }

        if (experienceYears.HasValue)
        {
            user.ExperienceYears = experienceYears.Value;
        }

        user.UpdatedAt = DateTime.UtcNow;
        user.UpdatedBy = actorUserId;

        await _db.SaveChangesAsync();

        // Re-query the user to ensure all navigation properties (like Skill.SkillName) are loaded
        var updatedUserEntity = await _db.Users
            .AsNoTracking()
            .Include(u => u.UserSkills).ThenInclude(us => us.Skill)
            .Include(u => u.Department)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.UserStaffRoles).ThenInclude(usr => usr.StaffRole)
            .Include(u => u.UserProjects).ThenInclude(up => up.Project)
            .FirstAsync(u => u.UserId == id);

        var updatedUser = MapToUserDto(updatedUserEntity);

        return (true, null, 200, updatedUser);
    }
    private static UserDto MapToUserDto(User u)
    {
        var daysRemaining = (u.ContractEnd.Date - DateTime.UtcNow.Date).Days;
        var staffRole = u.UserStaffRoles.Select(x => x.StaffRole.RoleName).FirstOrDefault()
                        ?? u.UserRoles.Select(x => x.Role.RoleName.ToString()).FirstOrDefault()
                        ?? "Staff";

        // Build contract history:
        // 1. Start with the original contract period as the first (oldest) entry.
        // 2. Append each Approved extension, each starting where the previous ended.
        var history = new List<ContractHistoryDto>();
        var today = DateTime.UtcNow.Date;
        var approvedExtensions = u.UserExtensions
            .Where(e => e.Status == "Approved")
            .OrderBy(e => e.ProcessedAt ?? e.CreatedAt)
            .ToList();

        // Reconstruct timeline: walk extensions in chronological order
        // to determine each period's StartDate and EndDate.
        DateTime periodStart = u.ContractStart;
        DateTime currentContractEnd = u.ContractEnd;

        // Re-derive the original contract end (before any extensions)
        // by subtracting all approved durations from the current ContractEnd.
        int totalExtendedMonths = approvedExtensions.Sum(e => e.ExtensionDuration);
        DateTime originalEnd = u.ContractEnd.AddMonths(-totalExtendedMonths);

        if (approvedExtensions.Count == 0)
        {
            // No extensions — single entry for the current/original contract
            var endDate = u.EmployeeType == Commons.Enums.EmployeeType.Permanent ? (DateTime?)null : u.ContractEnd;
            var daysUntilExpiry = endDate.HasValue ? (endDate.Value.Date - today).Days : (int?)null;
            history.Add(new ContractHistoryDto
            {
                StartDate = u.ContractStart,
                EndDate = u.ContractEnd,
                Role = GetRoleAtDate(u, u.ContractStart, staffRole),
                IsActive = true, // will be resolved below
                Duration = FormatDuration(u.ContractStart, u.ContractEnd),
                ExtendedOn = null,
                ExtendedBy = null,
                DaysUntilExpiry = daysUntilExpiry >= 0 ? daysUntilExpiry : null
            });
        }
        else
        {
            // Original contract period (before first extension)
            DateTime cursor = originalEnd;
            var origDaysUntilExpiry = (originalEnd.Date - today).Days;
            history.Add(new ContractHistoryDto
            {
                StartDate = u.ContractStart,
                EndDate = originalEnd,
                Role = GetRoleAtDate(u, u.ContractStart, staffRole),
                IsActive = false, // will be resolved below
                Duration = FormatDuration(u.ContractStart, originalEnd),
                ExtendedOn = null,
                ExtendedBy = null,
                DaysUntilExpiry = origDaysUntilExpiry >= 0 ? origDaysUntilExpiry : null
            });

            // Each extension period
            for (int i = 0; i < approvedExtensions.Count; i++)
            {
                var ext = approvedExtensions[i];
                bool isLast = i == approvedExtensions.Count - 1;
                DateTime extEnd = cursor.AddMonths(ext.ExtensionDuration);
                var extEndDate = isLast ? u.ContractEnd : extEnd;
                var extDaysUntilExpiry = (extEndDate.Date - today).Days;
                history.Add(new ContractHistoryDto
                {
                    StartDate = cursor,
                    EndDate = extEndDate,
                    Role = GetRoleAtDate(u, cursor, staffRole),
                    IsActive = false, // will be resolved below
                    Duration = FormatDuration(cursor, extEndDate),
                    ExtendedOn = ext.ProcessedAt ?? ext.CreatedAt,
                    ExtendedBy = ext.RequestedByUser?.UserName ?? "Admin HR",
                    DaysUntilExpiry = extDaysUntilExpiry >= 0 ? extDaysUntilExpiry : null
                });
                cursor = extEnd;
            }
        }

        // Resolve IsActive based on today's date, not position.
        // A period is active when: startDate <= today AND endDate >= today.
        var activePeriod = history
            .Where(h => h.StartDate.Date <= today && (h.EndDate == null || h.EndDate.Value.Date >= today))
            .OrderByDescending(h => h.StartDate)
            .FirstOrDefault();

        if (activePeriod != null)
        {
            activePeriod.IsActive = true;
        }
        else
        {
            // Fallback: mark the latest entry (by StartDate) as active
            var latest = history.OrderByDescending(h => h.StartDate).FirstOrDefault();
            if (latest != null) latest.IsActive = true;
        }

        // Sort descending by StartDate (newest first)
        history = history.OrderByDescending(h => h.StartDate).ToList();

        // Set DaysUntilExpiry only on the active entry (others irrelevant)
        foreach (var h in history)
        {
            if (!h.IsActive) h.DaysUntilExpiry = null;
        }

        return new UserDto
        {
            UserId = u.UserId,
            UserName = u.UserName,
            Email = u.Email,
            DepartmentId = u.DepartmentId,
            DepartmentName = u.Department?.DepartmentName ?? string.Empty,
            EmployeeType = u.EmployeeType,
            Role = staffRole,
            ExperienceYears = u.ExperienceYears,
            ContractStart = u.ContractStart,
            ContractEnd = u.ContractEnd,
            ContractStatus = u.ContractStatus,
            DaysRemaining = daysRemaining,
            Skills = u.UserSkills.Select(s => s.Skill.SkillName).ToList(),
            Roles = u.UserRoles.Select(r => r.Role.RoleName.ToString()).ToList(),
            Projects = u.UserProjects.Select(p => new UserProjectDto
            {
                UserProjectId = p.Id,
                ProjectId = p.ProjectId,
                ProjectName = p.Project?.ProjectName ?? string.Empty,
                ClientOrganization = p.Project?.ClientOrganization ?? string.Empty,
                RoleInProject = p.RoleInProject,
                StartDate = p.StartDate ?? p.Project?.EstimatedStartDate ?? DateTime.MinValue,
                EndDate = p.EndDate ?? p.Project?.EstimatedEndDate,
                Status = p.Status,
                ProjectStatus = p.Project?.ProjectStatus,
                IsUnread = !p.IsNotificationRead,
                SwapReason = p.SwapReason
            }).ToList(),
            ContractHistory = history,
            RoleHistories = BuildRoleHistories(u, staffRole),
            IsIntern = u.IsIntern,
            IsNotAvailableWfo = u.IsNotAvailableWfo
        };
    }

    private static string GetRoleAtDate(User u, DateTime date, string currentRoleName)
    {
        if (u.RoleHistories != null && u.RoleHistories.Any())
        {
            var rh = u.RoleHistories
                .OrderByDescending(h => h.StartDate)
                .FirstOrDefault(h => h.StartDate.Date <= date.Date && (h.EndDate == null || h.EndDate.Value.Date >= date.Date));
            if (rh != null) return rh.RoleName;
            
            var earliest = u.RoleHistories.OrderBy(h => h.StartDate).FirstOrDefault();
            if (earliest != null && date.Date < earliest.StartDate.Date)
                return earliest.RoleName;
        }
        return currentRoleName;
    }

    /// <summary>
    /// Builds the role history list for a user.
    /// Uses EmployeeRoleHistory records if present (tracked changes),
    /// otherwise falls back to a single current-role entry from UserStaffRole.
    /// </summary>
    private static List<RoleHistoryDto> BuildRoleHistories(User u, string currentRoleName)
    {
        if (u.RoleHistories != null && u.RoleHistories.Any())
        {
            return u.RoleHistories
                .OrderByDescending(rh => rh.StartDate)
                .Select(rh => new RoleHistoryDto
                {
                    RoleName = rh.RoleName,
                    StartDate = rh.StartDate,
                    EndDate = rh.EndDate,
                    IsCurrentRole = rh.IsCurrentRole,
                    Duration = rh.EndDate.HasValue
                        ? FormatDuration(rh.StartDate, rh.EndDate.Value)
                        : FormatDuration(rh.StartDate, DateTime.UtcNow)
                })
                .ToList();
        }

        // Fallback: no tracked history yet → return a single entry for the current role
        if (!string.IsNullOrWhiteSpace(currentRoleName))
        {
            return new List<RoleHistoryDto>
            {
                new RoleHistoryDto
                {
                    RoleName = currentRoleName,
                    StartDate = u.ContractStart,
                    EndDate = null,
                    IsCurrentRole = true,
                    Duration = FormatDuration(u.ContractStart, DateTime.UtcNow)
                }
            };
        }

        return new List<RoleHistoryDto>();

    }

    /// <summary>
    /// Retrieves the authenticated user's contract history.
    /// Returns the full ContractHistory list from MapToUserDto.
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode, List<ContractHistoryDto>? Data)> GetContractHistoryAsync(string userId)
    {
        var user = await _db.Users
            .AsNoTracking()
            .Include(u => u.Department)
            .Include(u => u.UserSkills).ThenInclude(us => us.Skill)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.UserStaffRoles).ThenInclude(usr => usr.StaffRole)
            .Include(u => u.UserProjects).ThenInclude(up => up.Project)
            .Include(u => u.UserExtensions).ThenInclude(e => e.RequestedByUser)
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (user is null)
            return (false, "User not found", 404, null);

        var dto = MapToUserDto(user);
        return (true, null, 200, dto.ContractHistory);
    }

    /// <summary>
    /// Converts a date range into a human-readable duration string.
    /// Examples: "2 years", "6 months", "2 years, 3 months"
    /// </summary>
    private static string FormatDuration(DateTime start, DateTime end)
    {
        int years = 0, months = 0;
        var cursor = start;
        while (cursor.AddYears(1) <= end) { years++; cursor = cursor.AddYears(1); }
        while (cursor.AddMonths(1) <= end) { months++; cursor = cursor.AddMonths(1); }

        if (years > 0 && months > 0)
            return $"{years} year{(years > 1 ? "s" : "")}, {months} month{(months > 1 ? "s" : "")}";
        if (years > 0)
            return $"{years} year{(years > 1 ? "s" : "")}";
        if (months > 0)
            return $"{months} month{(months > 1 ? "s" : "")}";
        return "< 1 month";
    }

    /// <summary>
    /// Retrieves a lightweight list of unread notifications for a specific user.
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode, Contracts.DTOs.User.NotificationResponseDto? Data)> GetUnreadNotificationsAsync(string userId)
    {
        var userExists = await _db.Users.AnyAsync(u => u.UserId == userId);
        if (!userExists)
            return (false, "User not found", 404, null);

        var unreadProjects = await _db.UserProjects
            .AsNoTracking()
            .Include(up => up.Project)
            .Where(up => up.UserId == userId && !up.IsNotificationRead)
            .ToListAsync();

        var notifications = unreadProjects.Select(p => new UserProjectDto
        {
            UserProjectId = p.Id,
            ProjectId = p.ProjectId,
            ProjectName = p.Project?.ProjectName ?? string.Empty,
            ClientOrganization = p.Project?.ClientOrganization ?? string.Empty,
            RoleInProject = p.RoleInProject,
            StartDate = p.StartDate ?? p.Project?.EstimatedStartDate ?? DateTime.MinValue,
            EndDate = p.EndDate ?? p.Project?.EstimatedEndDate,
            Status = p.Status,
            ProjectStatus = p.Project?.ProjectStatus,
            IsUnread = true,
            SwapReason = p.SwapReason
        }).ToList();

        var response = new Contracts.DTOs.User.NotificationResponseDto
        {
            HasUnread = notifications.Any(),
            Count = notifications.Count,
            Notifications = notifications
        };

        return (true, null, 200, response);
    }

    /// <summary>
    /// Updates the IsIntern status for a junior employee. HR-only operation.
    /// Uses optimistic update — returns the updated UserDto on success.
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode, UserDto? Data)> UpdateInternStatusAsync(
        string id, bool isIntern, string actorUserId)
    {
        var user = await _db.Users
            .Include(u => u.Department)
            .Include(u => u.UserSkills).ThenInclude(us => us.Skill)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.UserStaffRoles).ThenInclude(usr => usr.StaffRole)
            .Include(u => u.UserProjects).ThenInclude(up => up.Project)
            .Include(u => u.UserExtensions)
            .Include(u => u.RoleHistories)
            .FirstOrDefaultAsync(u => u.UserId == id);

        if (user is null)
            return (false, "Employee not found", 404, null);

        // Only allow setting IsIntern = true for junior-level staff roles
        var currentStaffRole = user.UserStaffRoles.Select(x => x.StaffRole.RoleName).FirstOrDefault() ?? string.Empty;
        if (isIntern && !currentStaffRole.StartsWith("Junior", StringComparison.OrdinalIgnoreCase))
            return (false, "Intern status can only be set for employees with a Junior staff role", 400, null);

        user.IsIntern = isIntern;
        user.UpdatedAt = DateTime.UtcNow;
        user.UpdatedBy = actorUserId;

        await _db.SaveChangesAsync();

        return (true, null, 200, MapToUserDto(user));
    }

    /// <summary>
    /// Updates the IsNotAvailableWfo flag for an employee.
    /// Only the employee themselves can call this — enforced at controller level.
    /// Any employee type/role may toggle this status.
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode, UserDto? Data)> UpdateWfoStatusAsync(
        string id, bool isNotAvailableWfo, string actorUserId)
    {
        var user = await _db.Users
            .Include(u => u.Department)
            .Include(u => u.UserSkills).ThenInclude(us => us.Skill)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.UserStaffRoles).ThenInclude(usr => usr.StaffRole)
            .Include(u => u.UserProjects).ThenInclude(up => up.Project)
            .Include(u => u.UserExtensions)
            .Include(u => u.RoleHistories)
            .FirstOrDefaultAsync(u => u.UserId == id);

        if (user is null)
            return (false, "Employee not found", 404, null);

        user.IsNotAvailableWfo = isNotAvailableWfo;
        user.UpdatedAt = DateTime.UtcNow;
        user.UpdatedBy = actorUserId;

        await _db.SaveChangesAsync();

        return (true, null, 200, MapToUserDto(user));
    }
}
