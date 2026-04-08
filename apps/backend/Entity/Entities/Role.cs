using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Commons.Enums;


namespace Entities.Entities;

public class Role
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int RoleId { get; set; }

    public RoleName RoleName { get; set; }

    // Navigation property
    [InverseProperty(nameof(UserRole.Role))]
    public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}