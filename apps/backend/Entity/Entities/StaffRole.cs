using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Entities.Entities;

public class StaffRole
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int StaffRoleId { get; set; }

    [StringLength(100)]
    public string RoleName { get; set; } = string.Empty;   // e.g., Senior BA, Junior Engineer

    // Navigation properties
    [InverseProperty(nameof(UserStaffRole.StaffRole))]
    public virtual ICollection<UserStaffRole> UserStaffRoles { get; set; } = new List<UserStaffRole>();

    [InverseProperty(nameof(ProjectRequiredRole.StaffRole))]
    public virtual ICollection<ProjectRequiredRole> ProjectRequiredRoles { get; set; } = new List<ProjectRequiredRole>();
}