using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Entities.Entities;

namespace Entities.Entities;

public class UserSkill
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [StringLength(20)]
    public string UserId { get; set; } = string.Empty;

    public int SkillId { get; set; }

    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = default!;

    [ForeignKey(nameof(SkillId))]
    public virtual Skill Skill { get; set; } = default!;
}