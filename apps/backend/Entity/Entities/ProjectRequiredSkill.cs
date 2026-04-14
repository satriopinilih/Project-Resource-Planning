using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Entities.Entities;

public class ProjectRequiredSkill
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    public int ProjectId { get; set; }

    public int SkillId { get; set; }

    [ForeignKey(nameof(ProjectId))]
    public virtual Project Project { get; set; } = default!;

    [ForeignKey(nameof(SkillId))]
    public virtual Skill Skill { get; set; } = default!;
}
