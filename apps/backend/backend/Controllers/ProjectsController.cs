using System.Security.Claims;
using Commons.Enums;
using Contracts.DTOs.Common;
using Contracts.DTOs.Project;
using Entities;
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
            Members = p.UserProjects
                // Sembunyikan Project Manager dari daftar member — fokus ke staff saja
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

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProject(int id, [FromBody] UpdateProjectRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var project = await _db.Projects.FindAsync(id);
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
