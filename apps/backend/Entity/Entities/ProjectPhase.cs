using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Entities.Entities;

/// <summary>
/// Master data for project phases (e.g., Development, QA/Testing).
/// Managed by GM/Admin via the Master Data menu.
/// </summary>
public class ProjectPhase
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    [InverseProperty(nameof(ActivityLog.ProjectPhase))]
    public virtual ICollection<ActivityLog> ActivityLogs { get; set; } = new List<ActivityLog>();
}
