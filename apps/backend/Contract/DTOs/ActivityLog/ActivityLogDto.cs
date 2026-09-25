namespace Contracts.DTOs.ActivityLog;

public class ActivityLogDto
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public int ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public int ProjectPhaseId { get; set; }
    public string PhaseName { get; set; } = string.Empty;

    /// <summary>Format: yyyy-MM-dd</summary>
    public string ActivityDate { get; set; } = string.Empty;

    /// <summary>Format: HH:mm — null when time range mode is OFF.</summary>
    public string? StartTime { get; set; }

    /// <summary>Format: HH:mm — null when time range mode is OFF.</summary>
    public string? EndTime { get; set; }

    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// True when the requesting PM does NOT manage this log's project.
    /// The Description will be replaced with "Mengerjakan task di project [ProjectName]".
    /// </summary>
    public bool IsRedacted { get; set; } = false;

    public DateTime CreatedAt { get; set; }
}
