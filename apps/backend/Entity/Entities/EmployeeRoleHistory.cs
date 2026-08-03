using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Entities.Entities;

/// <summary>
/// Tracks the history of staff role changes for an employee.
/// A new record is created each time a role change is approved via a contract extension.
/// The active role has IsCurrentRole = true and EndDate = null.
/// </summary>
public class EmployeeRoleHistory
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [StringLength(20)]
    public string UserId { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string RoleName { get; set; } = string.Empty;

    public DateTime StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    /// <summary>
    /// True if this is the employee's currently active role.
    /// Only one record per employee should have this set to true at any time.
    /// </summary>
    public bool IsCurrentRole { get; set; }

    /// <summary>
    /// UserId of the GM/HR who approved the role change.
    /// </summary>
    [StringLength(20)]
    public string ChangedBy { get; set; } = string.Empty;

    // Navigation
    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = default!;
}
