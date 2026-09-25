using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Entities.Entities;

/// <summary>
/// Stores each daily activity log entry submitted by a staff member.
/// StartTime and EndTime are nullable — only populated when the staff
/// has the "Use Time Range" toggle enabled on the frontend.
/// </summary>
public class ActivityLog
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    /// <summary>Staff member who submitted this log.</summary>
    [Required]
    [StringLength(20)]
    public string UserId { get; set; } = string.Empty;

    /// <summary>The project this log belongs to.</summary>
    public int ProjectId { get; set; }

    /// <summary>The project phase selected at time of logging.</summary>
    public int ProjectPhaseId { get; set; }

    /// <summary>
    /// The date of the activity. Allows backdate up to 7 days before the submission date.
    /// </summary>
    public DateOnly ActivityDate { get; set; }

    /// <summary>
    /// Optional start time. Populated only when "Use Time Range" toggle is ON.
    /// </summary>
    public TimeOnly? StartTime { get; set; }

    /// <summary>
    /// Optional end time. Populated only when "Use Time Range" toggle is ON.
    /// Must be greater than StartTime.
    /// </summary>
    public TimeOnly? EndTime { get; set; }

    /// <summary>Description of the activity performed.</summary>
    [Required]
    [StringLength(1000)]
    public string Description { get; set; } = string.Empty;

    // Audit fields
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = default!;

    [ForeignKey(nameof(ProjectId))]
    public virtual Project Project { get; set; } = default!;

    [ForeignKey(nameof(ProjectPhaseId))]
    public virtual ProjectPhase ProjectPhase { get; set; } = default!;
}
