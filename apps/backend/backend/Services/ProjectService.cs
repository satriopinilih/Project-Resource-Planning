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
    /// Marks ALL unread notification rows as read for a given project + user.
    /// Using Where instead of FirstOrDefault so multiple GM-notification rows
    /// (one per HR status update) are all dismissed in a single call.
    /// ProjectId == 0 is a sentinel used when a hire request has no project;
    /// in that case we match on RoleInProject == "GM Notification" for that user.
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode)> MarkAsReadAsync(int projectId, string userId)
    {
        List<UserProject> rows;

        if (projectId == 0)
        {
            // Sentinel path: no real project — match all unread GM notification rows for this user
            rows = await _db.UserProjects
                .Where(up => up.UserId == userId
                          && up.ProjectId == null
                          && up.RoleInProject == "GM Notification"
                          && !up.IsNotificationRead)
                .ToListAsync();
        }
        else
        {
            // Normal path: mark every unread notification row for this project + user
            rows = await _db.UserProjects
                .Where(up => up.ProjectId == projectId
                          && up.UserId == userId
                          && !up.IsNotificationRead)
                .ToListAsync();
        }

        if (rows.Count == 0)
        {
            // Already read or not found — treat as success so the frontend can dismiss optimistically
            return (true, null, 200);
        }

        foreach (var row in rows)
            row.IsNotificationRead = true;

        await _db.SaveChangesAsync();
        return (true, null, 200);
    }

    /// <summary>
    /// Marks a single specific notification row as read by its primary key (UserProject.Id).
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode)> MarkNotificationRowAsReadAsync(int userProjectId, string userId)
    {
        var row = await _db.UserProjects
            .FirstOrDefaultAsync(up => up.Id == userProjectId && up.UserId == userId);

        if (row != null && !row.IsNotificationRead)
        {
            row.IsNotificationRead = true;
            await _db.SaveChangesAsync();
        }
        return (true, null, 200);
    }

    /// <summary>
    /// Creates a new project with required roles and skills.
    /// Uses AddRange for batch inserts instead of looping .Add().
    /// </summary>
    private const int MaxTechnicalRoles = 5;

    public async Task<(bool Success, string? Error, int StatusCode, ProjectDto? Data)> CreateAsync(CreateProjectRequest request)
    {
        // --- Validate role constraints ---
        if (request.RequiredRoles != null && request.RequiredRoles.Any())
        {
            // 1. Max technical roles (excluding PM)
            var technicalRoles = request.RequiredRoles
                .Where(r => !string.Equals(NormalizeStaffRole(r.RoleName), "PM", StringComparison.OrdinalIgnoreCase))
                .ToList();
            if (technicalRoles.Count > MaxTechnicalRoles)
            {
                return (false, $"Maximum {MaxTechnicalRoles} technical roles allowed (excluding PM). You submitted {technicalRoles.Count}.", 400, null);
            }

            // 2. Prevent duplicate technical roles
            var duplicateRoles = technicalRoles
                .GroupBy(r => NormalizeStaffRole(r.RoleName), StringComparer.OrdinalIgnoreCase)
                .Where(g => g.Count() > 1)
                .Select(g => g.Key)
                .ToList();
            if (duplicateRoles.Any())
            {
                return (false, $"Duplicate roles detected: {string.Join(", ", duplicateRoles)}. Each role must be unique.", 400, null);
            }
        }

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
            existing.WorkingType = request.WorkingType;
            existing.StartDate = request.StartDate ?? project.EstimatedStartDate;
            existing.EndDate = request.EndDate ?? project.EstimatedEndDate;
            existing.Status = UserProjectStatus.Assigned;
            existing.IsNotificationRead = false;
            existing.SwapReason = "Assigned to project";
        }
        else
        {
            var userProject = new UserProject
            {
                UserId = request.UserId,
                ProjectId = projectId,
                RoleInProject = request.RoleInProject,
                WorkingType = request.WorkingType,
                StartDate = request.StartDate ?? project.EstimatedStartDate,
                EndDate = request.EndDate ?? project.EstimatedEndDate,
                Status = UserProjectStatus.Assigned,
                IsNotificationRead = false,
                SwapReason = "Assigned to project"
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
            .Include(up => up.Project)
            .FirstOrDefaultAsync(up => up.ProjectId == projectId && up.UserId == userId);

        if (assignment is null)
            return (false, "Assignment not found", 404);

        if (assignment.Project.ProjectStatus != ProjectStatus.Pending && assignment.StartDate <= DateTime.UtcNow)
        {
            // If they have likely contributed, mark as completed and trigger notification
            assignment.Status = UserProjectStatus.Completed;
            assignment.EndDate = DateTime.UtcNow;
            assignment.SwapReason = "Removed by GM";
            assignment.IsNotificationRead = false;
        }
        else
        {
            // If project hasn't started or they haven't started, just hard delete
            _db.UserProjects.Remove(assignment);
        }

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
                              up.RoleInProject.ToLower() == role.StaffRole.RoleName.ToLower() &&
                              up.WorkingType == role.WorkingType);

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
    /// Adds a new required role to an existing project.
    /// GM can add roles that marketing did not set during project creation.
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode, ProjectDto? Data)> AddRequiredRoleAsync(
        int projectId, AddRequiredRoleRequest request)
    {
        var project = await _db.Projects
            .Include(p => p.ProjectRequiredRoles)
                .ThenInclude(pr => pr.StaffRole)
            .FirstOrDefaultAsync(p => p.ProjectID == projectId);

        if (project is null)
            return (false, "Project not found", 404, null);

        // Normalize and validate role name
        var normalizedRoleName = NormalizeStaffRole(request.RoleName);
        if (!AllowedStaffRoles.Contains(normalizedRoleName))
            return (false, $"Role '{request.RoleName}' is not allowed. Allowed roles: PM, Senior Dev, Junior Dev, Senior BA, Junior BA, Architect.", 400, null);

        // Prevent duplicate roles with the same WorkingType on the same project.
        // The same role name with a DIFFERENT WorkingType is allowed (e.g. Junior Dev Dedicated + Junior Dev NonDedicated).
        var duplicate = project.ProjectRequiredRoles
            .Any(pr => string.Equals(pr.StaffRole?.RoleName, normalizedRoleName, StringComparison.OrdinalIgnoreCase)
                       && pr.WorkingType == request.WorkingType);
        if (duplicate)
            return (false, $"Role '{normalizedRoleName}' ({request.WorkingType}) already exists on this project. Change the Working Type or use the +/- buttons to adjust the count.", 409, null);

        // Find or create the StaffRole record
        var staffRole = await _db.StaffRoles.FirstOrDefaultAsync(sr => sr.RoleName == normalizedRoleName);
        if (staffRole is null)
        {
            staffRole = new StaffRole { RoleName = normalizedRoleName };
            _db.StaffRoles.Add(staffRole); // akan di-save bersama di bawah
        }

        var newRole = new ProjectRequiredRole
        {
            ProjectID = projectId,
            StaffRole = staffRole, // EF Core akan resolve StaffRoleId secara otomatis saat SaveChanges
            RequiredCount = request.Count > 0 ? request.Count : 1,
            WorkingType = request.WorkingType
        };
        _db.ProjectRequiredRoles.Add(newRole);
        await _db.SaveChangesAsync();

        // Re-fetch with full includes for response
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

        return (true, null, 201, MapToDto(updated));
    }

    /// <summary>
    /// Deletes a required role from an existing project.
    /// GM can delete any role EXCEPT PM, which is the default role set by Marketing.
    /// Cannot delete if there are members already assigned to that role.
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode, ProjectDto? Data)> DeleteRequiredRoleAsync(
        int projectId, int roleId)
    {
        var role = await _db.ProjectRequiredRoles
            .Include(pr => pr.StaffRole)
            .FirstOrDefaultAsync(pr => pr.Id == roleId && pr.ProjectID == projectId);

        if (role is null)
            return (false, "Role not found on this project", 404, null);

        // PM is the default role set by Marketing — it cannot be deleted by GM
        if (string.Equals(role.StaffRole?.RoleName, "PM", StringComparison.OrdinalIgnoreCase))
            return (false, "The PM role is a default Marketing role and cannot be deleted.", 403, null);

        // Cannot delete if there are members assigned to this role
        var filledCount = await _db.UserProjects
            .CountAsync(up => up.ProjectId == projectId &&
                              up.RoleInProject.ToLower() == role.StaffRole!.RoleName.ToLower() &&
                              up.WorkingType == role.WorkingType &&
                              up.Status == UserProjectStatus.Assigned);

        if (filledCount > 0)
            return (false, $"Cannot delete role '{role.StaffRole!.RoleName}' {filledCount} member(s) are currently assigned. Unassign them first.", 400, null);

        _db.ProjectRequiredRoles.Remove(role);
        await _db.SaveChangesAsync();

        // Re-fetch with full includes for response
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
        if (request.EstimatedStartDate.HasValue) project.EstimatedStartDate = DateTime.SpecifyKind(request.EstimatedStartDate.Value, DateTimeKind.Utc);
        if (request.EstimatedEndDate.HasValue) project.EstimatedEndDate = DateTime.SpecifyKind(request.EstimatedEndDate.Value, DateTimeKind.Utc);
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
    /// Soft Deletes a project (Sets status to Deleted and saves previous status).
    /// Also marks all currently Assigned members' UserProject records as Deleted
    /// so that employee history no longer shows this project as an active assignment.
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode)> DeleteAsync(int id)
    {
        var project = await _db.Projects
            .Include(p => p.UserProjects)
            .FirstOrDefaultAsync(p => p.ProjectID == id);
        if (project == null)
            return (false, "Project not found", 404);

        project.PreviousProjectStatus = project.ProjectStatus;
        project.ProjectStatus = Commons.Enums.ProjectStatus.Deleted;
        project.UpdatedAt = DateTime.UtcNow;

        // Update all currently Assigned members so employee history reflects the deletion
        foreach (var up in project.UserProjects.Where(up => up.Status == UserProjectStatus.Assigned))
        {
            up.Status = UserProjectStatus.Deleted;
        }

        await _db.SaveChangesAsync();
        return (true, null, 200);
    }

    /// <summary>
    /// Restores a deleted project to its previous status.
    /// Also restores all UserProject records that were marked as Deleted during soft-delete
    /// back to Assigned, so employee history reflects the restoration.
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode)> RestoreAsync(int id)
    {
        var project = await _db.Projects
            .Include(p => p.UserProjects)
            .FirstOrDefaultAsync(p => p.ProjectID == id);
        if (project == null)
            return (false, "Project not found", 404);

        project.ProjectStatus = project.PreviousProjectStatus ?? Commons.Enums.ProjectStatus.Pending;
        project.PreviousProjectStatus = null;
        project.UpdatedAt = DateTime.UtcNow;

        // Restore all members that were marked Deleted during soft-delete back to Assigned
        foreach (var up in project.UserProjects.Where(up => up.Status == UserProjectStatus.Deleted))
        {
            up.Status = UserProjectStatus.Assigned;
        }

        await _db.SaveChangesAsync();
        return (true, null, 200);
    }

    /// <summary>
    /// Swaps an existing assigned member with a new member on the same project.
    /// The old member is marked as Completed with an EndDate of now.
    /// The new member is assigned with the same role and a StartDate of now.
    /// Only allowed on Scheduled or Running projects.
    /// </summary>
    public async Task<(bool Success, string? Error, int StatusCode, ProjectDto? Data)> SwapMemberAsync(
        int projectId, SwapMemberRequest request)
    {
        var project = await _db.Projects.FindAsync(projectId);
        if (project is null)
            return (false, "Project not found", 404, null);

        // Only allow swap on Scheduled or Running projects
        if (project.ProjectStatus != ProjectStatus.Scheduled && project.ProjectStatus != ProjectStatus.Running)
            return (false, "Member swap is only allowed on Scheduled or Running projects.", 400, null);

        // Validate old user assignment
        var oldAssignment = await _db.UserProjects
            .FirstOrDefaultAsync(up => up.ProjectId == projectId && up.UserId == request.OldUserId && up.Status == UserProjectStatus.Assigned);

        if (oldAssignment is null)
            return (false, $"User '{request.OldUserId}' is not currently assigned to this project.", 404, null);

        // Validate new user exists
        var newUser = await _db.Users.FindAsync(request.NewUserId);
        if (newUser is null)
            return (false, $"User '{request.NewUserId}' not found.", 404, null);

        // Check new user is not already assigned to this project
        var existingNewAssignment = await _db.UserProjects
            .FirstOrDefaultAsync(up => up.ProjectId == projectId && up.UserId == request.NewUserId && up.Status == UserProjectStatus.Assigned);

        if (existingNewAssignment is not null)
            return (false, $"User '{request.NewUserId}' is already assigned to this project.", 409, null);

        // Mark old assignment as Completed
        oldAssignment.Status = UserProjectStatus.Completed;
        oldAssignment.EndDate = DateTime.UtcNow;
        oldAssignment.SwapReason = request.Reason;
        oldAssignment.ReplacedByUserId = request.NewUserId;

        // Create new assignment with same role and same working type
        var newAssignment = new UserProject
        {
            UserId = request.NewUserId,
            ProjectId = projectId,
            RoleInProject = oldAssignment.RoleInProject,
            WorkingType = oldAssignment.WorkingType,
            StartDate = DateTime.UtcNow,
            EndDate = project.EstimatedEndDate,
            Status = UserProjectStatus.Assigned
        };
        _db.UserProjects.Add(newAssignment);

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

    private static ProjectDto MapToDto(Project p, string? currentUserId = null)
    {
        // Build a lookup so we can resolve ReplacedByUserName
        var userNameLookup = p.UserProjects
            .Where(up => up.User != null)
            .GroupBy(up => up.UserId)
            .ToDictionary(g => g.Key, g => g.First().User!.UserName);

        var members = p.UserProjects
            .Where(up => up.RoleInProject != "GM Notification")
            .Select(up => new ProjectMemberDto
        {
            UserId = up.UserId,
            UserName = up.User?.UserName ?? up.UserId,
            Role = up.RoleInProject,
            WorkingType = up.WorkingType.ToString(),
            StaffRole = up.User?.UserStaffRoles.Select(s => s.StaffRole.RoleName).FirstOrDefault()
                        ?? up.User?.UserRoles.Select(r => r.Role.RoleName.ToString()).FirstOrDefault()
                        ?? "Staff",
            StartDate = up.StartDate,
            EndDate = up.EndDate,
            Status = up.Status.ToString(),
            SwapReason = up.SwapReason,
            ReplacedByUserId = up.ReplacedByUserId,
            ReplacedByUserName = up.ReplacedByUserId != null && userNameLookup.ContainsKey(up.ReplacedByUserId)
                ? userNameLookup[up.ReplacedByUserId] : null
        }).ToList();

        var requiredRoles = p.ProjectRequiredRoles.Select(pr => new ProjectRequiredRoleDto
        {
            Id = pr.Id,
            StaffRoleId = pr.StaffRoleId,
            RoleName = pr.StaffRole?.RoleName ?? "Unknown",
            RequiredCount = pr.RequiredCount,
            WorkingType = pr.WorkingType.ToString(),
            // Only count Assigned members matching both role name AND working type
            FilledCount = members.Count(m =>
                string.Equals(m.Role, pr.StaffRole?.RoleName, StringComparison.OrdinalIgnoreCase)
                && string.Equals(m.WorkingType, pr.WorkingType.ToString(), StringComparison.OrdinalIgnoreCase)
                && string.Equals(m.Status, "Assigned", StringComparison.OrdinalIgnoreCase)
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
            CreatedAt = p.CreatedAt,
            RequiredRoles = requiredRoles,
            RequiredSkills = requiredSkills,
            RequiredSkillIds = requiredSkillIds,
            Members = members
        };
    }
}
