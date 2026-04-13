using System.Security.Claims;
using Commons.Enums;
using Contracts.DTOs.Common;
using Contracts.DTOs.Project;
using Entities;
using Entities.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProjectsController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public ProjectsController(ApplicationDbContext db)
    {
        _db = db;
    }

    private string? CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ??
        User.FindFirstValue("sub");

    private bool IsPM =>
        User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "PM");

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ProjectDto>>>> GetAll([FromQuery] string? status)
    {
        var query = _db.Projects
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

        if (IsPM && CurrentUserId is not null)
        {
            query = query.Where(p => p.UserProjects.Any(up => up.UserId == CurrentUserId));
        }

        var projects = await query.OrderBy(p => p.EstimatedStartDate).ToListAsync();
        var data = projects.Select(p => MapToDto(p, CurrentUserId)).ToList();

        return Ok(ApiResponse<List<ProjectDto>>.SuccessResponse(data));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<ProjectDto>>> GetById(int id)
    {
        var project = await _db.Projects
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
            return NotFound(ApiResponse<ProjectDto>.ErrorResponse("Project not found"));

        if (IsPM && CurrentUserId is not null)
        {
            var isAssigned = project.UserProjects.Any(up => up.UserId == CurrentUserId);
            if (!isAssigned)
                return Forbid();
        }

        return Ok(ApiResponse<ProjectDto>.SuccessResponse(MapToDto(project, CurrentUserId)));
    }

    [HttpPost("mark-read/{id}")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var userId = CurrentUserId;
        if (userId == null)
            return Unauthorized();

        var userProject = await _db.UserProjects
            .FirstOrDefaultAsync(up => up.ProjectId == id && up.UserId == userId);

        if (userProject == null)
            return NotFound(ApiResponse<string>.ErrorResponse("Project assignment not found"));

        userProject.IsNotificationRead = true;
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<string>.SuccessResponse("Notification marked as read"));
    }

    private static ProjectDto MapToDto(Entities.Entities.Project p, string? currentUserId = null)
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
        var requiredSkillNames = p.ProjectRequiredSkills
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
            RequiredSkills = requiredSkillNames,
            RequiredSkillIds = requiredSkillIds,
            RequiredRoles = requiredRoles,
            RequiredSkills = requiredSkillNames,
            RequiredSkillIds = requiredSkillIds,   // Added from first controller
            Members = p.UserProjects
                .Where(up => !up.RoleInProject.Equals("Project Manager", StringComparison.OrdinalIgnoreCase))
                .Select(up => new ProjectMemberDto
                {
                    UserId = up.UserId,
                    UserName = up.User?.UserName ?? up.UserId,
                    Role = up.RoleInProject,
                    StaffRole = up.User?.UserStaffRoles.Select(s => s.StaffRole.RoleName).FirstOrDefault()
                                ?? up.User?.UserRoles.Select(r => r.Role.RoleName.ToString()).FirstOrDefault()
                                ?? "Staff"
                }).ToList()
        };
    }

    [HttpPost]
    public async Task<IActionResult> CreateProject([FromBody] CreateProjectRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // Pre‑validate Role Names (optional but keeps transaction clean)
        var roleMappings = new List<(CreateProjectRoleDto Dto, int StaffRoleId)>();
        if (request.RequiredRoles != null && request.RequiredRoles.Any())
        {
            foreach (var roleDto in request.RequiredRoles)
            {
                var staffRole = await _db.StaffRoles.FirstOrDefaultAsync(sr => sr.RoleName == roleDto.RoleName);
                if (staffRole == null)
                {
                    return BadRequest(ApiResponse<string>.ErrorResponse($"Staff Role '{roleDto.RoleName}' not found. Please ensure all requested roles exist in the HR system."));
                }
                roleMappings.Add((roleDto, staffRole.StaffRoleId));
            }
        }

        var project = new Entities.Entities.Project
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

                // Add roles
                foreach (var mapping in roleMappings)
                {
                    _db.ProjectRequiredRoles.Add(new Entities.Entities.ProjectRequiredRole
                    {
                        ProjectID = project.ProjectID,
                        StaffRoleId = mapping.StaffRoleId,
                        RequiredCount = mapping.Dto.Count,
                        WorkingType = mapping.Dto.WorkingType
                    });
                }

                // Add skills
                if (request.RequiredSkillIds != null && request.RequiredSkillIds.Any())
                {
                    foreach (var skillId in request.RequiredSkillIds)
                    {
                        _db.ProjectRequiredSkills.Add(new Entities.Entities.ProjectRequiredSkill
                        {
                            ProjectId = project.ProjectID,
                            SkillId = skillId
                        });
                    }
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
                return StatusCode(500, ApiResponse<string>.ErrorResponse("Database Error: " + detailedError));
            }
        }

        // Re‑fetch with all includes for correct mapping
        var createdProject = await _db.Projects
            .Include(p => p.ProjectRequiredRoles).ThenInclude(pr => pr.StaffRole)
            .Include(p => p.ProjectRequiredSkills).ThenInclude(ps => ps.Skill)
            .Include(p => p.UserProjects).ThenInclude(up => up.User)
            .FirstAsync(p => p.ProjectID == project.ProjectID);

        return CreatedAtAction(nameof(GetById), new { id = project.ProjectID },
            ApiResponse<ProjectDto>.SuccessResponse(MapToDto(createdProject)));
    }

    [HttpPost("{id}/assign")]
    public async Task<IActionResult> AssignMember(int id, [FromBody] AssignMemberRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var project = await _db.Projects.FindAsync(id);
        if (project is null)
            return NotFound(ApiResponse<string>.ErrorResponse("Project not found"));

        var user = await _db.Users.FindAsync(request.UserId);
        if (user is null)
            return NotFound(ApiResponse<string>.ErrorResponse("User not found"));

        var existing = await _db.UserProjects
            .FirstOrDefaultAsync(up => up.ProjectId == id && up.UserId == request.UserId);

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
                ProjectId = id,
                RoleInProject = request.RoleInProject,
                StartDate = request.StartDate ?? project.EstimatedStartDate,
                EndDate = request.EndDate ?? project.EstimatedEndDate,
                Status = UserProjectStatus.Assigned
            };
            _db.UserProjects.Add(userProject);
        }

        await _db.SaveChangesAsync();

        var updated = await _db.Projects
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
            .FirstAsync(p => p.ProjectID == id);

        return Ok(ApiResponse<ProjectDto>.SuccessResponse(MapToDto(updated), "Member assigned successfully"));
    }

    [HttpDelete("{id}/assign/{userId}")]
    public async Task<IActionResult> UnassignMember(int id, string userId)
    {
        var assignment = await _db.UserProjects
            .FirstOrDefaultAsync(up => up.ProjectId == id && up.UserId == userId);

        if (assignment is null)
            return NotFound(ApiResponse<string>.ErrorResponse("Assignment not found"));

        _db.UserProjects.Remove(assignment);
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<string>.SuccessResponse("Member removed from project"));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProject(int id, [FromBody] UpdateProjectRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // 1. Pre-fetch and Pre-validate Role Names (Outside Transaction)
        var project = await _db.Projects
            .Include(p => p.ProjectRequiredRoles)
            .Include(p => p.ProjectRequiredSkills)
            .Include(p => p.UserProjects).ThenInclude(up => up.User)
            .FirstOrDefaultAsync(p => p.ProjectID == id);
        if (project == null)
            return NotFound(ApiResponse<ProjectDto>.ErrorResponse("Project not found"));

        // Pre‑validate roles
        var roleMappings = new List<(CreateProjectRoleDto Dto, int StaffRoleId)>();
        if (request.RequiredRoles != null)
        {
            foreach (var roleDto in request.RequiredRoles)
            {
                var staffRole = await _db.StaffRoles.FirstOrDefaultAsync(sr => sr.RoleName == roleDto.RoleName);
                if (staffRole == null)
                {
                    return BadRequest(ApiResponse<string>.ErrorResponse($"Staff Role '{roleDto.RoleName}' not found. Please ensure it exists in the HR system."));
                }
                roleMappings.Add((roleDto, staffRole.StaffRoleId));
            }
        }

        // Update basic fields
        project.ProjectName = request.ProjectName;
        project.ClientOrganization = request.ClientOrganization;
        project.ProjectDescription = request.ProjectDescription;
        project.EstimatedDuration = request.EstimatedDuration;
        project.PriorityLevel = request.PriorityLevel;
        project.EstimatedStartDate = request.EstimatedStartDate;
        project.EstimatedEndDate = request.EstimatedEndDate;
        project.ProjectStatus = request.ProjectStatus;
        project.UpdatedAt = DateTime.UtcNow;
        project.UpdatedBy = "SystemUser";

        using (var transaction = await _db.Database.BeginTransactionAsync())
        {
            try
            {
                await _db.SaveChangesAsync(); // save basic changes

                // Update skills
                if (request.RequiredSkillIds != null)
                {
                    var existingSkills = await _db.ProjectRequiredSkills
                        .Where(ps => ps.ProjectId == id)
                        .ToListAsync();
                    _db.ProjectRequiredSkills.RemoveRange(existingSkills);

                    foreach (var skillId in request.RequiredSkillIds)
                    {
                        _db.ProjectRequiredSkills.Add(new Entities.Entities.ProjectRequiredSkill
                        {
                            ProjectId = id,
                            SkillId = skillId
                        });
                    }
                }

                // Update roles
                if (request.RequiredRoles != null)
                {
                    var existingRoles = await _db.ProjectRequiredRoles
                        .Where(pr => pr.ProjectID == id)
                        .ToListAsync();
                    _db.ProjectRequiredRoles.RemoveRange(existingRoles);

                    foreach (var mapping in roleMappings)
                    {
                        _db.ProjectRequiredRoles.Add(new Entities.Entities.ProjectRequiredRole
                        {
                            ProjectID = id,
                            StaffRoleId = mapping.StaffRoleId,
                            RequiredCount = mapping.Dto.Count,
                            WorkingType = mapping.Dto.WorkingType
                        });
                    }
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
                return StatusCode(500, ApiResponse<string>.ErrorResponse("Database Error: " + detailedError));
            }
        }

        // Re‑fetch with all includes for correct mapping
        var updatedProject = await _db.Projects
            .Include(p => p.ProjectRequiredRoles).ThenInclude(pr => pr.StaffRole)
            .Include(p => p.ProjectRequiredSkills).ThenInclude(ps => ps.Skill)
            .Include(p => p.UserProjects).ThenInclude(up => up.User)
            .FirstAsync(p => p.ProjectID == id);

        return Ok(ApiResponse<ProjectDto>.SuccessResponse(MapToDto(updatedProject)));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProject(int id)
    {
        var project = await _db.Projects.FindAsync(id);
        if (project == null)
        {
            return NotFound(ApiResponse<ProjectDto>.ErrorResponse("Project not found"));
        }

        try
        {
            _db.Projects.Remove(project);
            await _db.SaveChangesAsync();
            return Ok(ApiResponse<string>.SuccessResponse("Project deleted successfully"));
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while deleting the project.");
        }
    }
}