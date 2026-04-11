using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Entities;
using Commons.Enums;

namespace backend.Controllers;

[ApiController]
[Route("api/timeline")]
public class PMProjectController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public PMProjectController(ApplicationDbContext context)
    {
        _context = context;
    }

    private string? CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ??
        User.FindFirstValue("sub");

    private bool IsPM =>
        User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "PM");

    [HttpGet("projects")]
    public async Task<IActionResult> GetProjectTimeline()
    {
        var query = _context.Projects.AsQueryable();

        if (IsPM && CurrentUserId is not null)
        {
            query = query.Where(p => p.UserProjects.Any(up => up.UserId == CurrentUserId));
        }

        var projectsData = await query.ToListAsync();

        var result = projectsData.Select(p => new {
            label = p.ProjectName,
            subLabel = p.ClientOrganization,
            bars = new[] {
                new {
                    title = p.ProjectName,
                    status = p.ProjectStatus.ToString(), 
                    startDate = p.EstimatedStartDate.ToString("yyyy-MM-dd"),
                    endDate = p.EstimatedEndDate.ToString("yyyy-MM-dd")
                }
            }
        });

        return Ok(result);
    }

    [HttpGet("resources")]
    public async Task<IActionResult> GetResourceTimeline()
    {
        var userQuery = _context.Users
            .Include(u => u.UserProjects)
                .ThenInclude(up => up.Project)
            .Include(u => u.UserStaffRoles)
                .ThenInclude(usr => usr.StaffRole)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Where(u => u.UserProjects.Any())
            .Where(u => !u.UserRoles.Any(r =>
                r.Role.RoleName == RoleName.PM ||
                r.Role.RoleName == RoleName.GM ||
                r.Role.RoleName == RoleName.HR));

        List<int> pmProjectIds = new();
        if (IsPM && CurrentUserId is not null)
        {
            pmProjectIds = await _context.UserProjects
                .Where(up => up.UserId == CurrentUserId)
                .Select(up => up.ProjectId)
                .ToListAsync();

            userQuery = userQuery.Where(u =>
                u.UserProjects.Any(up => pmProjectIds.Contains(up.ProjectId)));
        }

        var userData = await userQuery.ToListAsync();

        var result = userData.Select(u => new {
            label = u.UserName,
            subLabel = u.UserStaffRoles.Select(usr => usr.StaffRole.RoleName).FirstOrDefault() ?? u.ExperienceLevel,
            
            bars = u.UserProjects
                .Where(up => !IsPM || pmProjectIds.Contains(up.ProjectId))
                .Select(up => new {
                    projectId = up.ProjectId,
                    title = up.Project.ProjectName,
                    status = up.Project.ProjectStatus.ToString(),
                    startDate = up.Project.EstimatedStartDate.ToString("yyyy-MM-dd"),
                    endDate = up.Project.EstimatedEndDate.ToString("yyyy-MM-dd")
                })
                .ToList()
        });

        return Ok(result);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetDashboardStats()
    {
        var today = DateTime.UtcNow;
        IQueryable<Entities.Entities.Project> query = _context.Projects;

        if (IsPM && CurrentUserId is not null)
        {
            query = query.Where(p => p.UserProjects.Any(up => up.UserId == CurrentUserId));
        }

        var projects = await query.Include(p => p.UserProjects).ToListAsync();

        var total = projects.Count;

        var onHold = projects.Count(p => 
            p.ProjectStatus == ProjectStatus.Pending);

        var scheduled = projects.Count(p => 
            p.ProjectStatus == ProjectStatus.Scheduled);

        var running = projects.Count(p => 
            p.ProjectStatus == ProjectStatus.Running);

        var completed = projects.Count(p => 
            p.ProjectStatus == ProjectStatus.Completed);

        return Ok(new {
            total,
            onHold,
            scheduled,
            running,
            completed
        });
    }


}
