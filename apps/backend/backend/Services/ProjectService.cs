using Commons.Enums;
using Contracts.DTOs.Common;
using Contracts.DTOs.Project;
using Entities;
using Entities.Entities;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public class ProjectService
{
    private readonly ApplicationDbContext _db;

    public ProjectService(ApplicationDbContext db)
    {
        _db = db;
    }

    private static readonly HashSet<string> AllowedStaffRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "PM", "Senior Dev", "Junior Dev", "Senior BA", "Junior BA", "Architect"
    };

    private static readonly Dictionary<string, string> StaffRoleAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Project Manager"] = "PM",
        ["Software Engineer"] = "Senior Dev",
        ["QA Tester"] = "Junior Dev"
    };

    private static string NormalizeStaffRole(string roleName)
    {
        if (string.IsNullOrWhiteSpace(roleName)) return roleName;
        return StaffRoleAliases.TryGetValue(roleName.Trim(), out var normalized)
            ? normalized
            : roleName.Trim();
    }

    /// <summary>
    /// Retrieves all projects with their members and required roles/skills.
    /// Uses AsNoTracking since this is a read-only display query.
    /// </summary>
    public async Task<List<ProjectDto>> GetAllAsync(string? status, string? currentUserId, bool isPM)
    {
        var query = _db.Projects
            .AsNoTracking()
            .Include(p => p.UserProjects)
                .ThenInclude(up => up.User)
                    .ThenInclude(u => u.UserStaffRoles)
                        .ThenInclude(usr => usr.StaffRole)
            .Include(p => p.UserProjects)
                .ThenInclude(up => up.User)
                    .ThenInclude(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
            .Include(p => p.ProjectRequiredRoles)
                .ThenInclude(pr => pr.StaffRole)
            .Include(p => p.ProjectRequiredSkills)
                .ThenInclude(ps => ps.Skill)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<ProjectStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(p => p.ProjectStatus == parsedStatus);
        }

        if (isPM && currentUserId is not null)
        {
            query = query.Where(p => p.UserProjects.Any(up => up.UserId == currentUserId));
        }

        var projects = await query.OrderBy(p => p.EstimatedStartDate).ToListAsync();
        return projects.Select(p => MapToDto(p, currentUserId)).ToList();
    }

    /// <summary>
    /// Retrieves a single project by ID. Uses AsNoTracking for read-only display.
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode, ProjectDto? Data)> GetByIdAsync(
        int id, string? currentUserId, bool isPM)
    {
        var project = await _db.Projects
            .AsNoTracking()
            .Include(p => p.UserProjects)
                .ThenInclude(up => up.User)
                    .ThenInclude(u => u.UserStaffRoles)
                        .ThenInclude(usr => usr.StaffRole)
            .Include(p => p.UserProjects)
                .ThenInclude(up => up.User)
                    .ThenInclude(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
            .Include(p => p.ProjectRequiredRoles)
                .ThenInclude(pr => pr.StaffRole)
            .Include(p => p.ProjectRequiredSkills)
                .ThenInclude(ps => ps.Skill)
            .FirstOrDefaultAsync(p => p.ProjectID == id);

        if (project is null)
            return (false, "Project not found", 404, null);

        if (isPM && currentUserId is not null)
        {
            var isAssigned = project.UserProjects.Any(up => up.UserId == currentUserId);
            if (!isAssigned)
                return (false, "Forbidden", 403, null);
        }

        return (true, null, 200, MapToDto(project, currentUserId));
    }

    /// <summary>
    /// Marks a project notification as read for the current user.
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode)> MarkAsReadAsync(int projectId, string userId)
    {
        var userProject = await _db.UserProjects
            .FirstOrDefaultAsync(up => up.ProjectId == projectId && up.UserId == userId);

        if (userProject == null)
            return (false, "Project assignment not found", 404);

        userProject.IsNotificationRead = true;
        await _db.SaveChangesAsync();

        return (true, null, 200);
    }

    /// <summary>
    /// Creates a new project with required roles and skills.
    /// Uses AddRange for batch inserts instead of looping .Add().
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode, ProjectDto? Data)> CreateAsync(CreateProjectRequest request)
    {
        // Pre-validate Role Names
        var roleMappings = new List<(CreateProjectRoleDto Dto, int StaffRoleId)>();
        if (request.RequiredRoles != null && request.RequiredRoles.Any())
        {
            foreach (var roleDto in request.RequiredRoles)
            {
                var normalizedRoleName = NormalizeStaffRole(roleDto.RoleName);
                if (!AllowedStaffRoles.Contains(normalizedRoleName))
                {
                    return (false, $"Role '{roleDto.RoleName}' is not allowed. Allowed roles: PM, Senior Dev, Junior Dev, Senior BA, Junior BA, Architect.", 400, null);
                }

                var staffRole = await _db.StaffRoles.FirstOrDefaultAsync(sr => sr.RoleName == normalizedRoleName);
                if (staffRole == null)
                {
                    staffRole = new StaffRole { RoleName = normalizedRoleName };
                    _db.StaffRoles.Add(staffRole);
                    await _db.SaveChangesAsync();
                }
                roleMappings.Add((new CreateProjectRoleDto
                {
                    RoleName = normalizedRoleName,
                    Count = roleDto.Count,
                    WorkingType = roleDto.WorkingType
                }, staffRole.StaffRoleId));
            }
        }

        var project = new Project
        {
            ProjectName = request.ProjectName,
            ClientOrganization = request.ClientOrganization,
            ProjectDescription = request.ProjectDescription,
            EstimatedDuration = request.EstimatedDuration,
            PriorityLevel = request.PriorityLevel,
            EstimatedStartDate = request.EstimatedStartDate,
            EstimatedEndDate = request.EstimatedEndDate,
            ProjectStatus = ProjectStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = "SystemUser",
            UpdatedBy = "SystemUser"
        };

        using (var transaction = await _db.Database.BeginTransactionAsync())
        {
            try
            {
                _db.Projects.Add(project);
                await _db.SaveChangesAsync();

                // Use AddRange instead of looping .Add() for batch efficiency
                var requiredRoles = roleMappings.Select(mapping => new ProjectRequiredRole
                {
                    ProjectID = project.ProjectID,
                    StaffRoleId = mapping.StaffRoleId,
                    RequiredCount = mapping.Dto.Count,
                    WorkingType = mapping.Dto.WorkingType
                }).ToList();
                _db.ProjectRequiredRoles.AddRange(requiredRoles);

                // Use AddRange for skills too
                if (request.RequiredSkillIds != null && request.RequiredSkillIds.Any())
                {
                    var requiredSkills = request.RequiredSkillIds.Select(skillId => new ProjectRequiredSkill
                    {
                        ProjectId = project.ProjectID,
                        SkillId = skillId
                    }).ToList();
                    _db.ProjectRequiredSkills.AddRange(requiredSkills);
                }

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                var detailedError = ex.Message;
                if (ex.InnerException != null)
                    detailedError += " | Details: " + ex.InnerException.Message;
                return (false, "Database Error: " + detailedError, 500, null);
            }
        }

        // Re-fetch with all includes for correct mapping
        var createdProject = await _db.Projects
            .AsNoTracking()
            .Include(p => p.ProjectRequiredRoles).ThenInclude(pr => pr.StaffRole)
            .Include(p => p.ProjectRequiredSkills).ThenInclude(ps => ps.Skill)
            .Include(p => p.UserProjects).ThenInclude(up => up.User)
            .FirstAsync(p => p.ProjectID == project.ProjectID);

        return (true, null, 201, MapToDto(createdProject));
    }

    /// <summary>
    /// Assigns a member to a project with a specific role and timeline.
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode, ProjectDto? Data)> AssignMemberAsync(
        int projectId, AssignMemberRequest request)
    {
        var project = await _db.Projects.FindAsync(projectId);
        if (project is null)
            return (false, "Project not found", 404, null);

        var user = await _db.Users.FindAsync(request.UserId);
        if (user is null)
            return (false, "User not found", 404, null);

        var existing = await _db.UserProjects
            .FirstOrDefaultAsync(up => up.ProjectId == projectId && up.UserId == request.UserId);

        if (existing is not null)
        {
            existing.RoleInProject = request.RoleInProject;
            existing.StartDate = request.StartDate ?? project.EstimatedStartDate;
            existing.EndDate = request.EndDate ?? project.EstimatedEndDate;
            existing.Status = UserProjectStatus.Assigned;
        }
        else
        {
            var userProject = new UserProject
            {
                UserId = request.UserId,
                ProjectId = projectId,
                RoleInProject = request.RoleInProject,
                StartDate = request.StartDate ?? project.EstimatedStartDate,
                EndDate = request.EndDate ?? project.EstimatedEndDate,
                Status = UserProjectStatus.Assigned
            };
            _db.UserProjects.Add(userProject);
        }

        await _db.SaveChangesAsync();

        // Re-fetch with includes for response
        var updated = await _db.Projects
            .AsNoTracking()
            .Include(p => p.UserProjects)
                .ThenInclude(up => up.User)
                    .ThenInclude(u => u.UserStaffRoles)
                        .ThenInclude(usr => usr.StaffRole)
            .Include(p => p.UserProjects)
                .ThenInclude(up => up.User)
                    .ThenInclude(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
            .Include(p => p.ProjectRequiredRoles)
                .ThenInclude(pr => pr.StaffRole)
            .Include(p => p.ProjectRequiredSkills)
                .ThenInclude(ps => ps.Skill)
            .FirstAsync(p => p.ProjectID == projectId);

        return (true, null, 200, MapToDto(updated));
    }

    /// <summary>
    /// Removes a member assignment from a project.
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode)> UnassignMemberAsync(int projectId, string userId)
    {
        var assignment = await _db.UserProjects
            .FirstOrDefaultAsync(up => up.ProjectId == projectId && up.UserId == userId);

        if (assignment is null)
            return (false, "Assignment not found", 404);

        _db.UserProjects.Remove(assignment);
        await _db.SaveChangesAsync();

        return (true, null, 200);
    }

    /// <summary>
    /// Updates the required headcount (RequiredCount) for a specific role on a project.
    /// The new count must be at least equal to the number of already-filled members in that role.
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode, ProjectDto? Data)> UpdateRoleCountAsync(
        int projectId, int roleId, int newCount)
    {
        var role = await _db.ProjectRequiredRoles
            .Include(pr => pr.StaffRole)
            .FirstOrDefaultAsync(pr => pr.Id == roleId && pr.ProjectID == projectId);

        if (role is null)
            return (false, "Role not found on this project", 404, null);

        if (newCount < 1)
            return (false, "Required count must be at least 1", 400, null);

        // Don't allow reducing below the number already filled
        var filledCount = await _db.UserProjects
            .CountAsync(up => up.ProjectId == projectId &&
                              up.RoleInProject.ToLower() == role.StaffRole.RoleName.ToLower());

        if (newCount < filledCount)
            return (false, $"Cannot reduce below the {filledCount} member(s) already assigned to this role.", 400, null);

        role.RequiredCount = newCount;
        await _db.SaveChangesAsync();

        // Re-fetch for response
        var updated = await _db.Projects
            .AsNoTracking()
            .Include(p => p.UserProjects).ThenInclude(up => up.User)
                .ThenInclude(u => u.UserStaffRoles).ThenInclude(usr => usr.StaffRole)
            .Include(p => p.UserProjects).ThenInclude(up => up.User)
                .ThenInclude(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(p => p.ProjectRequiredRoles).ThenInclude(pr => pr.StaffRole)
            .Include(p => p.ProjectRequiredSkills).ThenInclude(ps => ps.Skill)
            .FirstAsync(p => p.ProjectID == projectId);

        return (true, null, 200, MapToDto(updated));
    }

    /// <summary>
    /// Updates an existing project's details, required roles, and required skills.
    /// Uses AddRange/RemoveRange for batch operations instead of looped .Add()/.Remove().
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode, ProjectDto? Data)> UpdateAsync(
        int id, UpdateProjectRequest request, string? currentUserId)
    {
        Console.WriteLine($"[DEBUG] UpdateProject {id} - Roles count: {request.RequiredRoles?.Count ?? -1}");

        // Pre-fetch and Pre-validate Role Names
        var project = await _db.Projects
            .Include(p => p.ProjectRequiredRoles)
            .Include(p => p.ProjectRequiredSkills)
            .Include(p => p.UserProjects).ThenInclude(up => up.User)
            .FirstOrDefaultAsync(p => p.ProjectID == id);
        if (project == null)
            return (false, "Project not found", 404, null);

        // Pre-validate roles
        var roleMappings = new List<(CreateProjectRoleDto Dto, int StaffRoleId)>();
        if (request.RequiredRoles != null)
        {
            foreach (var roleDto in request.RequiredRoles)
            {
                var normalizedRoleName = NormalizeStaffRole(roleDto.RoleName);
                if (!AllowedStaffRoles.Contains(normalizedRoleName))
                {
                    return (false, $"Role '{roleDto.RoleName}' is not allowed. Allowed roles: PM, Senior Dev, Junior Dev, Senior BA, Junior BA, Architect.", 400, null);
                }

                var staffRole = await _db.StaffRoles.FirstOrDefaultAsync(sr => sr.RoleName == normalizedRoleName);
                if (staffRole == null)
                {
                    staffRole = new StaffRole { RoleName = normalizedRoleName };
                    _db.StaffRoles.Add(staffRole);
                    await _db.SaveChangesAsync();
                }
                WorkingType wt = WorkingType.Dedicated;
                if (roleDto.WorkingType != null && Enum.TryParse<WorkingType>(roleDto.WorkingType.ToString(), true, out var parsedWt))
                {
                    wt = parsedWt;
                }

                roleMappings.Add((new CreateProjectRoleDto
                {
                    RoleName = staffRole.RoleName,
                    Count = roleDto.Count > 0 ? roleDto.Count : 1,
                    WorkingType = wt
                }, staffRole.StaffRoleId));
            }
        }

        // Update basic fields safely (null-aware)
        if (request.ProjectName != null) project.ProjectName = request.ProjectName;
        if (request.ClientOrganization != null) project.ClientOrganization = request.ClientOrganization;
        if (request.ProjectDescription != null) project.ProjectDescription = request.ProjectDescription;
        if (request.EstimatedDuration.HasValue) project.EstimatedDuration = request.EstimatedDuration.Value;
        if (request.PriorityLevel.HasValue) project.PriorityLevel = request.PriorityLevel.Value;
        if (request.EstimatedStartDate.HasValue) project.EstimatedStartDate = request.EstimatedStartDate.Value;
        if (request.EstimatedEndDate.HasValue) project.EstimatedEndDate = request.EstimatedEndDate.Value;
        if (request.ProjectStatus.HasValue) project.ProjectStatus = request.ProjectStatus.Value;
        project.UpdatedAt = DateTime.UtcNow;
        project.UpdatedBy = currentUserId ?? "SystemUser";

        using (var transaction = await _db.Database.BeginTransactionAsync())
        {
            try
            {
                await _db.SaveChangesAsync(); // save basic changes

                // Update skills — use RemoveRange/AddRange for batch efficiency
                if (request.RequiredSkillIds != null && request.RequiredSkillIds.Any())
                {
                    var existingSkills = await _db.ProjectRequiredSkills
                        .Where(ps => ps.ProjectId == id)
                        .ToListAsync();
                    _db.ProjectRequiredSkills.RemoveRange(existingSkills);

                    var newSkills = request.RequiredSkillIds.Select(skillId => new ProjectRequiredSkill
                    {
                        ProjectId = id,
                        SkillId = skillId
                    }).ToList();
                    _db.ProjectRequiredSkills.AddRange(newSkills);
                }

                // Update roles — use RemoveRange/AddRange for batch efficiency
                if (request.RequiredRoles != null && request.RequiredRoles.Any() && roleMappings.Any())
                {
                    var existingRoles = await _db.ProjectRequiredRoles
                        .Where(pr => pr.ProjectID == id)
                        .ToListAsync();
                    _db.ProjectRequiredRoles.RemoveRange(existingRoles);

                    var newRoles = roleMappings.Select(mapping => new ProjectRequiredRole
                    {
                        ProjectID = id,
                        StaffRoleId = mapping.StaffRoleId,
                        RequiredCount = mapping.Dto.Count,
                        WorkingType = mapping.Dto.WorkingType
                    }).ToList();
                    _db.ProjectRequiredRoles.AddRange(newRoles);
                }

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                var detailedError = ex.Message;
                if (ex.InnerException != null)
                    detailedError += " | Details: " + ex.InnerException.Message;
                return (false, "Database Error: " + detailedError, 500, null);
            }
        }

        // Re-fetch with all includes for correct mapping
        var updatedProject = await _db.Projects
            .AsNoTracking()
            .Include(p => p.ProjectRequiredRoles).ThenInclude(pr => pr.StaffRole)
            .Include(p => p.ProjectRequiredSkills).ThenInclude(ps => ps.Skill)
            .Include(p => p.UserProjects).ThenInclude(up => up.User)
            .FirstAsync(p => p.ProjectID == id);

        return (true, null, 200, MapToDto(updatedProject));
    }

    /// <summary>
    /// Updates only the status of a project.
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode, ProjectDto? Data)> UpdateStatusAsync(
        int id, UpdateProjectStatusRequest request, string? currentUserId)
    {
        var project = await _db.Projects.FindAsync(id);
        if (project == null)
            return (false, "Project not found", 404, null);

        project.ProjectStatus = request.ProjectStatus;
        project.UpdatedAt = DateTime.UtcNow;
        project.UpdatedBy = currentUserId ?? "SystemUser";
        await _db.SaveChangesAsync();

        var updatedProject = await _db.Projects
            .AsNoTracking()
            .Include(p => p.ProjectRequiredRoles).ThenInclude(pr => pr.StaffRole)
            .Include(p => p.ProjectRequiredSkills).ThenInclude(ps => ps.Skill)
            .Include(p => p.UserProjects).ThenInclude(up => up.User)
            .FirstAsync(p => p.ProjectID == id);

        return (true, null, 200, MapToDto(updatedProject));
    }

    /// <summary>
    /// Deletes a project (only Pending projects can be deleted).
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode)> DeleteAsync(int id)
    {
        var project = await _db.Projects.FindAsync(id);
        if (project == null)
            return (false, "Project not found", 404);

        if (project.ProjectStatus != 0)
            return (false, "Only pending projects can be canceled.", 400);

        _db.Projects.Remove(project);
        await _db.SaveChangesAsync();
        return (true, null, 200);
    }

    private static ProjectDto MapToDto(Project p, string? currentUserId = null)
    {
        var members = p.UserProjects.Select(up => new ProjectMemberDto
        {
            UserId = up.UserId,
            UserName = up.User?.UserName ?? up.UserId,
            Role = up.RoleInProject,
            StaffRole = up.User?.UserStaffRoles.Select(s => s.StaffRole.RoleName).FirstOrDefault()
                        ?? up.User?.UserRoles.Select(r => r.Role.RoleName.ToString()).FirstOrDefault()
                        ?? "Staff",
            StartDate = up.StartDate,
            EndDate = up.EndDate,
            Status = up.Status.ToString()
        }).ToList();

        var requiredRoles = p.ProjectRequiredRoles.Select(pr => new ProjectRequiredRoleDto
        {
            Id = pr.Id,
            StaffRoleId = pr.StaffRoleId,
            RoleName = pr.StaffRole?.RoleName ?? "Unknown",
            RequiredCount = pr.RequiredCount,
            WorkingType = pr.WorkingType.ToString(),
            FilledCount = members.Count(m =>
                string.Equals(m.Role, pr.StaffRole?.RoleName, StringComparison.OrdinalIgnoreCase)
            )
        }).ToList();

        // Project-level required skills (names + ids)
        var requiredSkills = p.ProjectRequiredSkills
            .Select(ps => ps.Skill.SkillName)
            .Distinct()
            .OrderBy(s => s)
            .ToList();

        var requiredSkillIds = p.ProjectRequiredSkills
            .Select(ps => ps.SkillId)
            .Distinct()
            .ToList();

        return new ProjectDto
        {
            ProjectId = p.ProjectID,
            ProjectName = p.ProjectName,
            ClientOrganization = p.ClientOrganization,
            ProjectDescription = p.ProjectDescription,
            EstimatedDuration = p.EstimatedDuration,
            PriorityLevel = p.PriorityLevel,
            EstimatedStartDate = p.EstimatedStartDate,
            EstimatedEndDate = p.EstimatedEndDate,
            ProjectStatus = p.ProjectStatus,
            IsUnread = currentUserId != null && p.UserProjects.Any(up => up.UserId == currentUserId && !up.IsNotificationRead),
            RequiredRoles = requiredRoles,
            RequiredSkills = requiredSkills,
            RequiredSkillIds = requiredSkillIds,
            Members = p.UserProjects
                .Select(up => new ProjectMemberDto
                {
                    UserId = up.UserId,
                    UserName = up.User?.UserName ?? up.UserId,
                    Role = up.RoleInProject,
                    StaffRole = up.User?.UserStaffRoles.Select(s => s.StaffRole.RoleName).FirstOrDefault()
                                ?? up.User?.UserRoles.Select(r => r.Role.RoleName.ToString()).FirstOrDefault()
                                ?? "Staff",
                    StartDate = up.StartDate,
                    EndDate = up.EndDate,
                    Status = up.Status.ToString()
                }).ToList()
        };
    }
}
