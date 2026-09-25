using System.Globalization;
using System.Text;
using Contracts.DTOs.ActivityLog;
using Entities;
using Entities.Entities;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

/// <summary>
/// Business logic for the Daily Activity Log (Timesheet) feature.
///
/// Key rules enforced here:
///  - Backdate limit: ActivityDate must not be more than 7 days before today (Asia/Jakarta).
///  - Overlap validation: If StartTime+EndTime are provided, the new entry must not
///    overlap with existing timed entries for the same user on the same date.
///  - Daily hours warning: If the total logged time for a day exceeds 8 hours the
///    service returns a non-blocking warning flag (OverHoursWarning = true).
///  - Smart Privacy Logic: PM viewing team logs can only see full details for logs
///    that belong to projects they manage. Logs from other projects are redacted.
/// </summary>
public class ActivityLogService
{
    private readonly ApplicationDbContext _db;
    private const int MaxBackdateDays = 7;
    private const double DailyHoursWarningThreshold = 8.0;
    private static readonly TimeZoneInfo JakartaTz = ResolveJakartaTimeZone();

    public ActivityLogService(ApplicationDbContext db)
    {
        _db = db;
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private static TimeZoneInfo ResolveJakartaTimeZone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Jakarta"); }
        catch (Exception)
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time"); }
            catch (Exception)
            {
                // Fixed UTC+7 offset if named zones are unavailable
                return TimeZoneInfo.CreateCustomTimeZone("WIB", TimeSpan.FromHours(7), "WIB", "WIB");
            }
        }
    }

    /// <summary>Today's calendar date in Asia/Jakarta (WIB).</summary>
    private static DateOnly TodayJakarta()
        => DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, JakartaTz));

    private static ActivityLogDto MapToDto(ActivityLog log, bool redact = false)
    {
        return new ActivityLogDto
        {
            Id = log.Id,
            UserId = log.UserId,
            UserName = log.User?.UserName ?? string.Empty,
            ProjectId = log.ProjectId,
            ProjectName = log.Project?.ProjectName ?? string.Empty,
            ProjectPhaseId = log.ProjectPhaseId,
            PhaseName = log.ProjectPhase?.Name ?? string.Empty,
            ActivityDate = log.ActivityDate.ToString("yyyy-MM-dd"),
            StartTime = log.StartTime?.ToString("HH:mm"),
            EndTime = log.EndTime?.ToString("HH:mm"),
            Description = redact
                ? $"Mengerjakan task di project {log.Project?.ProjectName ?? "lain"}"
                : log.Description,
            IsRedacted = redact,
            CreatedAt = log.CreatedAt
        };
    }

    private static IQueryable<ActivityLog> WithIncludes(IQueryable<ActivityLog> q)
        => q.Include(al => al.User)
             .Include(al => al.Project)
             .Include(al => al.ProjectPhase);

    // ── Staff: own logs ───────────────────────────────────────────────────────

    /// <summary>
    /// Returns the requesting staff member's own activity logs.
    /// Optionally filtered by project and/or date range.
    /// </summary>
    public async Task<List<ActivityLogDto>> GetMyLogsAsync(
        string userId,
        int? projectId = null,
        string? startDate = null,
        string? endDate = null)
    {
        var query = WithIncludes(_db.ActivityLogs)
            .Where(al => al.UserId == userId);

        if (projectId.HasValue)
            query = query.Where(al => al.ProjectId == projectId.Value);

        if (DateOnly.TryParse(startDate, out var sd))
            query = query.Where(al => al.ActivityDate >= sd);

        if (DateOnly.TryParse(endDate, out var ed))
            query = query.Where(al => al.ActivityDate <= ed);

        return await query
            .OrderByDescending(al => al.ActivityDate)
            .ThenBy(al => al.StartTime)
            .Select(al => MapToDto(al))
            .ToListAsync();
    }

    /// <summary>
    /// Returns a list of work dates in the current week (Mon–today) that have
    /// zero activity logs for the given user. Used to drive the alert banner.
    /// Holidays (national + client-specific from the user's projects) are excluded
    /// from the "empty days" so they don't trigger alerts.
    /// </summary>
    public async Task<List<string>> GetEmptyWorkDaysThisWeekAsync(string userId)
    {
        var today = TodayJakarta();
        var monday = today.AddDays(-(int)today.DayOfWeek + (int)DayOfWeek.Monday);
        if (monday > today) monday = monday.AddDays(-7);

        var mondayDt = monday.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var todayDt  = today.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

        var daysToCheck = Enumerable
            .Range(0, today.DayNumber - monday.DayNumber + 1)
            .Select(i => monday.AddDays(i))
            .Where(d => d.DayOfWeek != DayOfWeek.Saturday && d.DayOfWeek != DayOfWeek.Sunday)
            .ToList();

        // Collect client IDs from projects the user is currently assigned to
        var userClientIds = await _db.UserProjects
            .Where(up => up.UserId == userId)
            .Join(_db.Projects, up => up.ProjectId, p => p.ProjectID,
                  (up, p) => p.ClientOrganization)
            .Distinct()
            .ToListAsync();

        // Resolve client IDs by matching ClientOrganization name → Client.Name
        var matchedClientIds = await _db.Clients
            .Where(c => userClientIds.Contains(c.Name))
            .Select(c => c.Id)
            .ToListAsync();

        // Fetch holidays: national (ClientId == null) OR matching client
        var holidays = await _db.Holidays
            .Where(h =>
                h.DateStart <= todayDt && h.DateEnd >= mondayDt &&
                (h.ClientId == null || matchedClientIds.Contains(h.ClientId!.Value)))
            .ToListAsync();

        // Build a set of all holiday DateOnly values in the week range
        var holidayDates = new HashSet<DateOnly>();
        foreach (var h in holidays)
        {
            var hStart = DateOnly.FromDateTime(h.DateStart);
            var hEnd   = DateOnly.FromDateTime(h.DateEnd);
            for (var d = hStart; d <= hEnd; d = d.AddDays(1))
            {
                holidayDates.Add(d);
            }
        }

        var loggedDates = await _db.ActivityLogs
            .Where(al => al.UserId == userId && al.ActivityDate >= monday && al.ActivityDate <= today)
            .Select(al => al.ActivityDate)
            .Distinct()
            .ToListAsync();

        return daysToCheck
            .Where(d => !loggedDates.Contains(d) && !holidayDates.Contains(d))
            .Select(d => d.ToString("yyyy-MM-dd"))
            .ToList();
    }

    /// <summary>
    /// Returns holidays relevant to the given user for a specific month.
    /// Includes: national holidays + client holidays from the user's assigned projects.
    /// Used by the frontend Attendance Tracker to show holiday labels on calendar dates.
    /// </summary>
    public async Task<List<(string Date, string Name)>> GetHolidaysForUserMonthAsync(string userId, int year, int month, int? projectId = null)
    {
        var startDt = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var endDt   = startDt.AddMonths(1).AddTicks(-1);

        List<string> userClientNames;
        if (projectId.HasValue)
        {
            userClientNames = await _db.Projects
                .Where(p => p.ProjectID == projectId.Value)
                .Select(p => p.ClientOrganization)
                .Where(c => !string.IsNullOrEmpty(c))
                .Distinct()
                .ToListAsync();
        }
        else
        {
            userClientNames = await _db.UserProjects
                .Where(up => up.UserId == userId)
                .Join(_db.Projects, up => up.ProjectId, p => p.ProjectID,
                      (up, p) => p.ClientOrganization)
                .Where(c => !string.IsNullOrEmpty(c))
                .Distinct()
                .ToListAsync();
        }

        var matchedClientIds = await _db.Clients
            .Where(c => userClientNames.Contains(c.Name))
            .Select(c => c.Id)
            .ToListAsync();

        var holidays = await _db.Holidays
            .Where(h =>
                h.DateStart <= endDt && h.DateEnd >= startDt &&
                (h.ClientId == null || matchedClientIds.Contains(h.ClientId!.Value)))
            .OrderBy(h => h.DateStart)
            .ToListAsync();

        var result = new List<(string, string)>();
        foreach (var h in holidays)
        {
            var hStart = DateOnly.FromDateTime(h.DateStart);
            var hEnd   = DateOnly.FromDateTime(h.DateEnd);
            var rangeStart = new DateOnly(year, month, 1);
            var rangeEnd   = new DateOnly(year, month, DateTime.DaysInMonth(year, month));
            for (var d = hStart; d <= hEnd; d = d.AddDays(1))
            {
                if (d >= rangeStart && d <= rangeEnd)
                    result.Add((d.ToString("yyyy-MM-dd"), h.Name));
            }
        }

        return result;
    }

    // ── PM/GM: team logs with Smart Privacy Logic ─────────────────────────────

    /// <summary>
    /// Returns whether the requesting user is allowed to view team logs for a project.
    /// GM always allowed; otherwise must be PM on that project.
    /// </summary>
    public async Task<bool> CanAccessProjectTeamAsync(string requestingUserId, bool isGm, int projectId)
    {
        if (isGm) return true;
        return await _db.UserProjects.AnyAsync(up =>
            up.UserId == requestingUserId
            && up.ProjectId == projectId
            && up.RoleInProject == "PM");
    }

    /// <summary>
    /// Returns all activity logs for members of a given project.
    /// For each log, the service checks whether the requesting PM also manages
    /// the project the log was submitted for:
    ///   - Same project → full detail.
    ///   - Different project → redacted (only project name visible).
    /// GM always sees full detail.
    /// </summary>
    public async Task<List<ActivityLogDto>> GetTeamLogsAsync(
        string requestingUserId,
        bool isGm,
        int projectId,
        string? date = null,
        string? startDate = null,
        string? endDate = null,
        string? staffUserId = null)
    {
        // Collect all projects managed by the requesting PM (used for privacy check)
        HashSet<int> managedProjectIds = new();
        if (!isGm)
        {
            managedProjectIds = (await _db.UserProjects
                .Where(up => up.UserId == requestingUserId && up.RoleInProject == "PM")
                .Select(up => up.ProjectId)
                .ToListAsync())
                .Where(id => id.HasValue)
                .Select(id => id!.Value)
                .ToHashSet();
        }

        // Find all staff userIds currently in the requested project (excluding PM)
        var memberIds = await _db.UserProjects
            .Where(up => up.ProjectId == projectId && up.RoleInProject != "PM")
            .Select(up => up.UserId)
            .Distinct()
            .ToListAsync();

        var query = WithIncludes(_db.ActivityLogs)
            .Where(al => memberIds.Contains(al.UserId));

        // Single-day filter takes precedence when provided
        if (DateOnly.TryParse(date, out var d))
            query = query.Where(al => al.ActivityDate == d);
        else
        {
            if (DateOnly.TryParse(startDate, out var sd))
                query = query.Where(al => al.ActivityDate >= sd);
            if (DateOnly.TryParse(endDate, out var ed))
                query = query.Where(al => al.ActivityDate <= ed);
        }

        if (!string.IsNullOrWhiteSpace(staffUserId))
            query = query.Where(al => al.UserId == staffUserId);

        var logs = await query
            .OrderByDescending(al => al.ActivityDate)
            .ThenBy(al => al.UserId)
            .ThenBy(al => al.StartTime)
            .ToListAsync();

        return logs.Select(log =>
        {
            bool redact = !isGm && !managedProjectIds.Contains(log.ProjectId);
            return MapToDto(log, redact);
        }).ToList();
    }

    // ── Create ────────────────────────────────────────────────────────────────

    public async Task<(bool Success, string? Error, ActivityLogDto? Data, bool OverHoursWarning)> CreateAsync(
        string userId,
        CreateActivityLogRequest request)
    {
        // 1. Parse and validate ActivityDate
        if (!DateOnly.TryParse(request.ActivityDate, out var activityDate))
            return (false, "Invalid date format. Use yyyy-MM-dd.", null, false);

        var today = TodayJakarta();
        if (activityDate > today)
            return (false, "Activity date cannot be in the future.", null, false);
        if ((today.DayNumber - activityDate.DayNumber) > MaxBackdateDays)
            return (false, $"Activity date cannot be more than {MaxBackdateDays} days in the past.", null, false);

        // 2. Validate project membership (staff must be assigned to this project)
        var isMember = await _db.UserProjects
            .AnyAsync(up => up.UserId == userId && up.ProjectId == request.ProjectId && up.RoleInProject != "PM");

        if (!isMember)
            return (false, "You are not a staff member of this project.", null, false);

        // 3. Validate phase exists
        var phaseExists = await _db.ProjectPhases.AnyAsync(pp => pp.Id == request.ProjectPhaseId);
        if (!phaseExists)
            return (false, "Project phase not found.", null, false);

        // 4. Parse optional time fields
        TimeOnly? startTime = null;
        TimeOnly? endTime = null;

        if (!string.IsNullOrWhiteSpace(request.StartTime) || !string.IsNullOrWhiteSpace(request.EndTime))
        {
            if (!TimeOnly.TryParseExact(request.StartTime, "HH:mm", null, DateTimeStyles.None, out var parsedStart))
                return (false, "Invalid StartTime format. Use HH:mm.", null, false);
            if (!TimeOnly.TryParseExact(request.EndTime, "HH:mm", null, DateTimeStyles.None, out var parsedEnd))
                return (false, "Invalid EndTime format. Use HH:mm.", null, false);
            if (parsedEnd <= parsedStart)
                return (false, "EndTime must be later than StartTime.", null, false);

            startTime = parsedStart;
            endTime = parsedEnd;

            // 5. Overlap check: compare against all timed entries for this user on this date
            var existingTimedLogs = await _db.ActivityLogs
                .Where(al => al.UserId == userId
                          && al.ActivityDate == activityDate
                          && al.StartTime != null
                          && al.EndTime != null)
                .ToListAsync();

            var overlap = existingTimedLogs.Any(al =>
                parsedStart < al.EndTime!.Value && parsedEnd > al.StartTime!.Value);

            if (overlap)
                return (false, "The time range overlaps with an existing log entry on this date.", null, false);
        }

        // 6. Persist
        var log = new ActivityLog
        {
            UserId = userId,
            ProjectId = request.ProjectId,
            ProjectPhaseId = request.ProjectPhaseId,
            ActivityDate = activityDate,
            StartTime = startTime,
            EndTime = endTime,
            Description = request.Description.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.ActivityLogs.Add(log);
        await _db.SaveChangesAsync();

        // 7. Reload with navigation properties
        log = await WithIncludes(_db.ActivityLogs)
            .FirstAsync(al => al.Id == log.Id);

        // 8. Daily hours warning check
        bool overHours = false;
        if (startTime.HasValue && endTime.HasValue)
        {
            var timedLogs = await _db.ActivityLogs
                .Where(al => al.UserId == userId
                          && al.ActivityDate == activityDate
                          && al.StartTime != null
                          && al.EndTime != null)
                .ToListAsync();

            var totalMinutes = timedLogs
                .Sum(al => (al.EndTime!.Value - al.StartTime!.Value).TotalMinutes);

            overHours = totalMinutes > DailyHoursWarningThreshold * 60;
        }

        return (true, null, MapToDto(log), overHours);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    public async Task<(bool Success, string? Error, ActivityLogDto? Data, bool OverHoursWarning)> UpdateAsync(
        int id,
        string userId,
        UpdateActivityLogRequest request)
    {
        var log = await WithIncludes(_db.ActivityLogs)
            .FirstOrDefaultAsync(al => al.Id == id);

        if (log is null)
            return (false, "Activity log not found.", null, false);

        if (log.UserId != userId)
            return (false, "You can only edit your own activity logs.", null, false);

        if (!DateOnly.TryParse(request.ActivityDate, out var activityDate))
            return (false, "Invalid date format. Use yyyy-MM-dd.", null, false);

        var today = TodayJakarta();
        if (activityDate > today)
            return (false, "Activity date cannot be in the future.", null, false);
        if ((today.DayNumber - activityDate.DayNumber) > MaxBackdateDays)
            return (false, $"Activity date cannot be more than {MaxBackdateDays} days in the past.", null, false);

        var phaseExists = await _db.ProjectPhases.AnyAsync(pp => pp.Id == request.ProjectPhaseId);
        if (!phaseExists)
            return (false, "Project phase not found.", null, false);

        TimeOnly? startTime = null;
        TimeOnly? endTime = null;

        if (!string.IsNullOrWhiteSpace(request.StartTime) || !string.IsNullOrWhiteSpace(request.EndTime))
        {
            if (!TimeOnly.TryParseExact(request.StartTime, "HH:mm", null, DateTimeStyles.None, out var parsedStart))
                return (false, "Invalid StartTime format. Use HH:mm.", null, false);
            if (!TimeOnly.TryParseExact(request.EndTime, "HH:mm", null, DateTimeStyles.None, out var parsedEnd))
                return (false, "Invalid EndTime format. Use HH:mm.", null, false);
            if (parsedEnd <= parsedStart)
                return (false, "EndTime must be later than StartTime.", null, false);

            startTime = parsedStart;
            endTime = parsedEnd;

            var existingTimedLogs = await _db.ActivityLogs
                .Where(al => al.UserId == userId
                          && al.ActivityDate == activityDate
                          && al.StartTime != null
                          && al.EndTime != null
                          && al.Id != id) // exclude self
                .ToListAsync();

            var overlap = existingTimedLogs.Any(al =>
                parsedStart < al.EndTime!.Value && parsedEnd > al.StartTime!.Value);

            if (overlap)
                return (false, "The time range overlaps with an existing log entry on this date.", null, false);
        }

        log.ProjectPhaseId = request.ProjectPhaseId;
        log.ActivityDate = activityDate;
        log.StartTime = startTime;
        log.EndTime = endTime;
        log.Description = request.Description.Trim();
        log.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        // Reload with nav props after update
        log = await WithIncludes(_db.ActivityLogs).FirstAsync(al => al.Id == id);

        bool overHours = false;
        if (startTime.HasValue && endTime.HasValue)
        {
            var timedLogs = await _db.ActivityLogs
                .Where(al => al.UserId == userId
                          && al.ActivityDate == activityDate
                          && al.StartTime != null
                          && al.EndTime != null)
                .ToListAsync();

            var totalMinutes = timedLogs
                .Sum(al => (al.EndTime!.Value - al.StartTime!.Value).TotalMinutes);

            overHours = totalMinutes > DailyHoursWarningThreshold * 60;
        }

        return (true, null, MapToDto(log), overHours);
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    public async Task<(bool Success, string? Error)> DeleteAsync(int id, string userId)
    {
        var log = await _db.ActivityLogs.FindAsync(id);

        if (log is null)
            return (false, "Activity log not found.");
        if (log.UserId != userId)
            return (false, "You can only delete your own activity logs.");

        _db.ActivityLogs.Remove(log);
        await _db.SaveChangesAsync();

        return (true, null);
    }

    // ── Export ────────────────────────────────────────────────────────────────

    /// <summary>
    /// Generates a UTF-8 CSV byte array for all team logs in a project.
    /// Only non-redacted (full-detail) logs are exported.
    /// </summary>
    public async Task<(bool Success, string? Error, byte[]? Data)> ExportToCsvAsync(
        string requestingUserId,
        bool isGm,
        int projectId,
        string? startDate = null,
        string? endDate = null)
    {
        if (!await CanAccessProjectTeamAsync(requestingUserId, isGm, projectId))
            return (false, "You are not authorized to export logs for this project.", null);

        HashSet<int> managedProjectIds = new();
        if (!isGm)
        {
            managedProjectIds = (await _db.UserProjects
                .Where(up => up.UserId == requestingUserId && up.RoleInProject == "PM")
                .Select(up => up.ProjectId)
                .ToListAsync())
                .Where(id => id.HasValue)
                .Select(id => id!.Value)
                .ToHashSet();
        }

        var memberIds = await _db.UserProjects
            .Where(up => up.ProjectId == projectId && up.RoleInProject != "PM")
            .Select(up => up.UserId)
            .Distinct()
            .ToListAsync();

        var query = WithIncludes(_db.ActivityLogs)
            .Where(al => memberIds.Contains(al.UserId));

        if (DateOnly.TryParse(startDate, out var sd))
            query = query.Where(al => al.ActivityDate >= sd);
        if (DateOnly.TryParse(endDate, out var ed))
            query = query.Where(al => al.ActivityDate <= ed);

        var logs = await query
            .OrderBy(al => al.ActivityDate)
            .ThenBy(al => al.UserId)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Date,Staff ID,Staff Name,Project,Phase,Start Time,End Time,Description");

        foreach (var log in logs)
        {
            bool redact = !isGm && !managedProjectIds.Contains(log.ProjectId);
            if (redact) continue; // Skip redacted entries in export

            var desc = log.Description.Replace("\"", "\"\"");
            sb.AppendLine(
                $"\"{log.ActivityDate:yyyy-MM-dd}\"," +
                $"\"{log.UserId}\"," +
                $"\"{log.User?.UserName}\"," +
                $"\"{log.Project?.ProjectName}\"," +
                $"\"{log.ProjectPhase?.Name}\"," +
                $"\"{log.StartTime?.ToString("HH:mm") ?? "-"}\"," +
                $"\"{log.EndTime?.ToString("HH:mm") ?? "-"}\"," +
                $"\"{desc}\""
            );
        }

        return (true, null, Encoding.UTF8.GetBytes(sb.ToString()));
    }
}
