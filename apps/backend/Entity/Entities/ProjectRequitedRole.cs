using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Commons.Enums;
using Entities.Entities;

namespace Entities.Entities;

public class ProjectRequiredRole
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    public int ProjectID { get; set; }

    public int StaffRoleId { get; set; }

    public int RequiredCount { get; set; }

    public WorkingType WorkingType { get; set; }

    [ForeignKey(nameof(ProjectID))]
    public virtual Project Project { get; set; } = default!;

    [ForeignKey(nameof(StaffRoleId))]
    public virtual StaffRole StaffRole { get; set; } = default!;
}