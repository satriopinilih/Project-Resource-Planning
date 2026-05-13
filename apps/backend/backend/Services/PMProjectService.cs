using Commons.Enums;
using Entities;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public class PMProjectService
{
    private readonly ApplicationDbContext _db;

    public PMProjectService(ApplicationDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Retrieves project timeline data, scoped by PM if applicable.
    /// Uses AsNoTracking since this is a read-only display query.
    /// </summary>
    public async Task<object> GetProjectTimelineAsync(string? currentUserId, bool isPM)
    {
        var query = _db.Projects.AsNoTracking().AsQueryable();

        if (isPM && currentUserId is not null)
        {
            query = query.Where(p => p.UserProjects.Any(up => up.UserId == currentUserId));
        }

        var projectsData = await query.ToListAsync();

        return projectsData.Select(p => new
        {
            label = p.ProjectName,
            subLabel = p.ClientOrganization,
            bars = new[]
            {
                new
                {
                    title = p.ProjectName,
                    status = p.ProjectStatus.ToString(),
                    startDate = p.EstimatedStartDate.ToString("yyyy-MM-dd"),
                    endDate = p.EstimatedEndDate.ToString("yyyy-MM-dd")
                }
            }
        });
    }

    /// <summary>
    /// Retrieves resource timeline data showing employee assignments across projects.
    /// Uses AsNoTracking since this is a read-only display query.
    /// </summary>
    public async Task<object> GetResourceTimelineAsync(string? currentUserId, bool isPM)
    {
        var userQuery = _db.Users
            .AsNoTracking()
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
        if (isPM && currentUserId is not null)
        {
            pmProjectIds = await _db.UserProjects
                .AsNoTracking()
                .Where(up => up.UserId == currentUserId)
                .Select(up => up.ProjectId)
                .ToListAsync();

            userQuery = userQuery.Where(u =>
                u.UserProjects.Any(up => pmProjectIds.Contains(up.ProjectId)));
        }

        var userData = await userQuery.ToListAsync();

        return userData.Select(u => new
        {
            label = u.UserName,
            subLabel = u.UserStaffRoles.Select(usr => usr.StaffRole.RoleName).FirstOrDefault() ?? u.ExperienceYears.ToString() + "yr",
            bars = u.UserProjects
                .Where(up => !isPM || pmProjectIds.Contains(up.ProjectId))
                .Select(up => new
                {
                    projectId = up.ProjectId,
                    title = up.Project.ProjectName,
                    status = up.Project.ProjectStatus.ToString(),
                    startDate = up.Project.EstimatedStartDate.ToString("yyyy-MM-dd"),
                    endDate = up.Project.EstimatedEndDate.ToString("yyyy-MM-dd")
                })
                .ToList()
        });
    }

    /// <summary>
    /// Retrieves dashboard statistics (total, on hold, scheduled, running, completed).
    /// Uses AsNoTracking since this is a read-only display query.
    /// </summary>
    public async Task<object> GetDashboardStatsAsync(string? currentUserId, bool isPM)
    {
        IQueryable<Entities.Entities.Project> query = _db.Projects.AsNoTracking();

        if (isPM && currentUserId is not null)
        {
            query = query.Where(p => p.UserProjects.Any(up => up.UserId == currentUserId));
        }

        var projects = await query.Include(p => p.UserProjects).ToListAsync();

        var total = projects.Count;
        var onHold = projects.Count(p => p.ProjectStatus == ProjectStatus.Pending);
        var scheduled = projects.Count(p => p.ProjectStatus == ProjectStatus.Scheduled);
        var running = projects.Count(p => p.ProjectStatus == ProjectStatus.Running);
        var completed = projects.Count(p => p.ProjectStatus == ProjectStatus.Completed);

        return new { total, onHold, scheduled, running, completed };
    }
}
