using System.ComponentModel.DataAnnotations;

namespace Contracts.DTOs.ActivityLog;

public class CreateActivityLogRequest
{
    [Required]
    public int ProjectId { get; set; }

    [Required]
    public int ProjectPhaseId { get; set; }

    /// <summary>Format: yyyy-MM-dd. Max 7 days in the past.</summary>
    [Required]
    public string ActivityDate { get; set; } = string.Empty;

    /// <summary>Format: HH:mm. Required only when using time range mode.</summary>
    public string? StartTime { get; set; }

    /// <summary>Format: HH:mm. Must be after StartTime. Required only when using time range mode.</summary>
    public string? EndTime { get; set; }

    [Required]
    [StringLength(1000, MinimumLength = 5)]
    public string Description { get; set; } = string.Empty;
}
