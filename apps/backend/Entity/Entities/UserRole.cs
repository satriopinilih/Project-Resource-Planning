using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Entities.Entities;

namespace Entities.Entities;

public class UserRole
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int UserRolesId { get; set; }

    [StringLength(20)]
    public string UserId { get; set; } = string.Empty;

    public int RoleId { get; set; }

    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = default!;

    [ForeignKey(nameof(RoleId))]
    public virtual Role Role { get; set; } = default!;
}