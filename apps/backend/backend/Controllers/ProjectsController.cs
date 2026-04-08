using Commons.Enums;
using Contracts.DTOs.Common;
using Contracts.DTOs.Project;
using Entities;
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
            .FirstOrDefaultAsync(p => p.ProjectID == id);

        if (project is null)
            return NotFound(ApiResponse<ProjectDto>.ErrorResponse("Project not found"));

        return Ok(ApiResponse<ProjectDto>.SuccessResponse(MapToDto(project)));
    }

    private static ProjectDto MapToDto(Entities.Entities.Project p)
    {
        var endDate = p.EstimatedStartDate.AddDays(p.EstimatedDuration * 7);

        return new ProjectDto
        {
            ProjectId = p.ProjectID,
            ProjectName = p.ProjectName,
            ClientOrganization = p.ClientOrganization,
            ProjectDescription = p.ProjectDescription,
            EstimatedDuration = p.EstimatedDuration,
            PriorityLevel = p.PriorityLevel,
            EstimatedStartDate = p.EstimatedStartDate,
            EstimatedEndDate = endDate,
            ProjectStatus = p.ProjectStatus,
            Members = p.UserProjects.Select(up => new ProjectMemberDto
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
}
