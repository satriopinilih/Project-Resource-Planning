using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Commons.Enums;
using Entities.Entities;

namespace Entities.Entities;

public class UserProject
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [StringLength(20)]
    public string UserId { get; set; } = string.Empty;

    public int ProjectId { get; set; }

    [StringLength(100)]
    public string RoleInProject { get; set; } = string.Empty;

    public UserProjectStatus Status { get; set; }

    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = default!;

    [ForeignKey(nameof(ProjectId))]
    public virtual Project Project { get; set; } = default!;
}