using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Entities.Entities;

namespace Entities.Entities;

public class UserStaffRole
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [StringLength(20)]
    public string UserId { get; set; } = string.Empty;

    public int StaffRoleId { get; set; }

    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = default!;

    [ForeignKey(nameof(StaffRoleId))]
    public virtual StaffRole StaffRole { get; set; } = default!;
}