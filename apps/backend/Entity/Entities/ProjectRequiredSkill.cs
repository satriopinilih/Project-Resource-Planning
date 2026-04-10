using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Entities.Entities;

/// <summary>
/// Links a project to a specific skill that is needed for this project.
/// This is a project-level skill requirement, separate from role requirements.
/// Example: "This project needs Python, React, and PostgreSQL"
/// </summary>
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
