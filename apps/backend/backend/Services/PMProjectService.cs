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
        var query = _db.Projects.AsNoTracking()
            .Where(p => p.ProjectStatus != ProjectStatus.Deleted)
            .AsQueryable();

        if (isPM && currentUserId is not null)
        {
            query = query.Where(p => p.UserProjects.Any(up => up.UserId == currentUserId));
        }

        var projectsData = await query
            .Include(p => p.UserProjects)
            .ToListAsync();

        return projectsData.Select(p =>
        {
            var userAssignment = p.UserProjects.FirstOrDefault(up => up.UserId == currentUserId);
            
            var isPmSwappedOut = isPM && userAssignment != null &&
                                 userAssignment.RoleInProject.Equals("PM", StringComparison.OrdinalIgnoreCase) &&
                                 userAssignment.Status == UserProjectStatus.Completed;

            var statusStr = isPmSwappedOut ? "Completed" : p.ProjectStatus.ToString();
            
            var endDateStr = (isPmSwappedOut && userAssignment?.EndDate != null)
                ? userAssignment.EndDate.Value.ToString("yyyy-MM-dd")
                : p.EstimatedEndDate.ToString("yyyy-MM-dd");

            var startDateStr = (isPM && userAssignment?.StartDate != null)
                ? userAssignment.StartDate.Value.ToString("yyyy-MM-dd")
                : p.EstimatedStartDate.ToString("yyyy-MM-dd");

            return new
            {
                label = p.ProjectName,
                subLabel = p.ClientOrganization,
                bars = new[]
                {
                    new
                    {
                        title = p.ProjectName,
                        status = statusStr,
                        startDate = startDateStr,
                        endDate = endDateStr,
                        projectStatus = p.ProjectStatus.ToString()
                    }
                }
            };
        }).ToList();
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
            .Where(u => u.UserProjects.Any(up => up.Project.ProjectStatus != ProjectStatus.Deleted))
            .Where(u => !u.UserRoles.Any(r =>
                r.Role.RoleName == RoleName.PM ||
                r.Role.RoleName == RoleName.GM ||
                r.Role.RoleName == RoleName.HR));

        List<int> pmProjectIds = new();
        if (isPM && currentUserId is not null)
        {
            pmProjectIds = await _db.UserProjects
                .AsNoTracking()
                .Where(up => up.UserId == currentUserId && up.ProjectId.HasValue)
                .Select(up => up.ProjectId!.Value)
                .ToListAsync();

            userQuery = userQuery.Where(u =>
                u.UserProjects.Any(up => up.ProjectId.HasValue && pmProjectIds.Contains(up.ProjectId.Value)));
        }

        var userData = await userQuery.ToListAsync();

        return userData.Select(u => new
        {
            label = u.UserName,
            subLabel = u.UserStaffRoles.Select(usr => usr.StaffRole.RoleName).FirstOrDefault() ?? u.ExperienceYears.ToString() + "yr",
            bars = u.UserProjects
                .Where(up => !isPM || (up.ProjectId.HasValue && pmProjectIds.Contains(up.ProjectId.Value)))
                .Where(up => up.Project.ProjectStatus != ProjectStatus.Deleted)
                .Select(up => {
                    var statusStr = up.Status == UserProjectStatus.Completed
                        ? "Completed"
                        : (up.Project.ProjectStatus == ProjectStatus.Completed ? "Running" : up.Project.ProjectStatus.ToString());
                    var endDateVal = up.Status == UserProjectStatus.Completed
                        ? (up.EndDate ?? up.Project.EstimatedEndDate)
                        : up.Project.EstimatedEndDate;

                    return new
                    {
                        projectId = up.ProjectId,
                        title = up.Project.ProjectName,
                        status = statusStr,
                        startDate = (up.StartDate ?? up.Project.EstimatedStartDate).ToString("yyyy-MM-dd"),
                        endDate = endDateVal.ToString("yyyy-MM-dd"),
                        projectStatus = up.Project.ProjectStatus.ToString()
                    };
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
        IQueryable<Entities.Entities.Project> query = _db.Projects.AsNoTracking()
            .Where(p => p.ProjectStatus != ProjectStatus.Deleted);

        if (isPM && currentUserId is not null)
        {
            query = query.Where(p => p.UserProjects.Any(up => up.UserId == currentUserId));
        }

        var projects = await query.Include(p => p.UserProjects).ToListAsync();

        var total = projects.Count;
        var onHold = 0;
        var scheduled = 0;
        var running = 0;
        var completed = 0;

        foreach (var p in projects)
        {
            var userAssignment = p.UserProjects.FirstOrDefault(up => up.UserId == currentUserId);
            var isPmSwapped = isPM && userAssignment != null &&
                              userAssignment.RoleInProject.Equals("PM", StringComparison.OrdinalIgnoreCase) &&
                              userAssignment.Status == UserProjectStatus.Completed;

            var effectiveStatus = isPmSwapped ? ProjectStatus.Completed : p.ProjectStatus;

            if (effectiveStatus == ProjectStatus.Pending) onHold++;
            else if (effectiveStatus == ProjectStatus.Scheduled) scheduled++;
            else if (effectiveStatus == ProjectStatus.Running) running++;
            else if (effectiveStatus == ProjectStatus.Completed) completed++;
        }

        return new { total, onHold, scheduled, running, completed };
    }
}