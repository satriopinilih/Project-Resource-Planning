using System.ComponentModel.DataAnnotations;

namespace Contracts.DTOs.ActivityLog;

public class UpdateActivityLogRequest
{
    [Required]
    public int ProjectPhaseId { get; set; }

    /// <summary>Format: yyyy-MM-dd. Max 7 days in the past.</summary>
    [Required]
    public string ActivityDate { get; set; } = string.Empty;

    /// <summary>Format: HH:mm. Nullable — clears time if null.</summary>
    public string? StartTime { get; set; }

    /// <summary>Format: HH:mm. Must be after StartTime. Nullable — clears time if null.</summary>
    public string? EndTime { get; set; }

    [Required]
    [StringLength(1000, MinimumLength = 5)]
    public string Description { get; set; } = string.Empty;
}
