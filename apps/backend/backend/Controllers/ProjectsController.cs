using System.Security.Claims;
using Commons.Enums;
using Contracts.DTOs.Common;
using Contracts.DTOs.Project;
using Entities;
using Entities.Entities;
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
        var data = projects.Select(MapToDto).ToList();

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

        return Ok(ApiResponse<ProjectDto>.SuccessResponse(MapToDto(project)));
    }

    private static ProjectDto MapToDto(Entities.Entities.Project p)
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
                string.Equals(m.Role, pr.StaffRole?.RoleName, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(m.StaffRole, pr.StaffRole?.RoleName, StringComparison.OrdinalIgnoreCase)
            )
        }).ToList();

        // Project-level required skills (separate from roles)
        var requiredSkills = p.ProjectRequiredSkills
            .Select(ps => ps.Skill.SkillName)
            .Distinct()
            .OrderBy(s => s)
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
            Members = members,
            RequiredRoles = requiredRoles,
            RequiredSkills = requiredSkills
        };
    }
    [HttpPost]
    public async Task<IActionResult> CreateProject([FromBody] CreateProjectRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // Map DTO to Entity
        var project = new Entities.Entities.Project
        {
            ProjectName = request.ProjectName,
            ClientOrganization = request.ClientOrganization,
            ProjectDescription = request.ProjectDescription,
            EstimatedDuration = request.EstimatedDuration,
            PriorityLevel = request.PriorityLevel,
            EstimatedStartDate = request.EstimatedStartDate,
            EstimatedEndDate = request.EstimatedEndDate,
            
            // Set default status for new projects
            ProjectStatus = ProjectStatus.Pending, 

            // Handle Audit Fields
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = "SystemUser", // Replace with User.Identity.Name if using Auth
            UpdatedBy = "SystemUser"
        };

        try 
        {
            using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                _db.Projects.Add(project);
                await _db.SaveChangesAsync();

                if (request.RequiredRoles != null && request.RequiredRoles.Any())
                {
                    foreach (var roleDto in request.RequiredRoles)
                    {
                        var staffRole = await _db.StaffRoles.FirstOrDefaultAsync(sr => sr.RoleName == roleDto.RoleName);
                        if (staffRole == null)
                        {
                            return BadRequest(ApiResponse<string>.ErrorResponse($"Staff Role '{roleDto.RoleName}' not found."));
                        }

                        var requiredRole = new Entities.Entities.ProjectRequiredRole
                        {
                            ProjectID = project.ProjectID,
                            StaffRoleId = staffRole.StaffRoleId,
                            RequiredCount = roleDto.Count,
                            WorkingType = roleDto.WorkingType
                        };
                        _db.ProjectRequiredRoles.Add(requiredRole);
                    }
                    await _db.SaveChangesAsync();
                }

                await transaction.CommitAsync();
                return CreatedAtAction(nameof(GetById), new { id = project.ProjectID }, ApiResponse<ProjectDto>.SuccessResponse(MapToDto(project)));
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
        catch (Exception ex)
        {
            // Log exception here
            return StatusCode(500, ApiResponse<string>.ErrorResponse("An error occurred while creating the project. " + ex.Message));
        }
    }

    // ── Assign a member to a project with timeline ──
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

        // Check if already assigned
        var existing = await _db.UserProjects
            .FirstOrDefaultAsync(up => up.ProjectId == id && up.UserId == request.UserId);

        if (existing is not null)
        {
            // Update the existing assignment
            existing.RoleInProject = request.RoleInProject;
            existing.StartDate = request.StartDate ?? project.EstimatedStartDate;
            existing.EndDate = request.EndDate ?? project.EstimatedEndDate;
            existing.Status = UserProjectStatus.Assigned;
        }
        else
        {
            // Create new assignment
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

        // Re-fetch with includes to return full DTO
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

    // ── Remove a member from a project ──
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
        {
            return BadRequest(ModelState);
        }

        var project = await _db.Projects
            .Include(p => p.ProjectRequiredRoles)
            .Include(p => p.ProjectRequiredSkills)
            .Include(p => p.UserProjects)
                .ThenInclude(up => up.User)
            .FirstOrDefaultAsync(p => p.ProjectID == id);
        if (project == null)
        {
            return NotFound(ApiResponse<ProjectDto>.ErrorResponse("Project not found"));
        }

        project.ProjectName = request.ProjectName;
        project.ClientOrganization = request.ClientOrganization;
        project.ProjectDescription = request.ProjectDescription;
        project.EstimatedDuration = request.EstimatedDuration;
        project.PriorityLevel = request.PriorityLevel;
        project.EstimatedStartDate = request.EstimatedStartDate;
        project.EstimatedEndDate = request.EstimatedEndDate;
        project.ProjectStatus = request.ProjectStatus;

        project.UpdatedAt = DateTime.UtcNow;
        project.UpdatedBy = "SystemUser"; // Replace with User.Identity.Name if using Auth

        try
        {
            await _db.SaveChangesAsync();
            return Ok(ApiResponse<ProjectDto>.SuccessResponse(MapToDto(project)));
        }
        catch (Exception ex)
        {
            // Log exception here
            return StatusCode(500, "An error occurred while updating the project.");
        }
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
        catch (Exception ex)
        {
            // Log exception here
            return StatusCode(500, "An error occurred while deleting the project.");
        }
    }
}
