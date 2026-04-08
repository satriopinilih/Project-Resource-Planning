using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Entities.Entities;

public class Skill
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int SkillID { get; set; }

    [StringLength(100)]
    public string SkillName { get; set; } = string.Empty;   // e.g., React, Node JS

    // Navigation property
    [InverseProperty(nameof(UserSkill.Skill))]
    public virtual ICollection<UserSkill> UserSkills { get; set; } = new List<UserSkill>();
}