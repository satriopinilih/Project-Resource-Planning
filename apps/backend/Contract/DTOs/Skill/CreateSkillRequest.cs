using System.ComponentModel.DataAnnotations;

namespace Contracts.DTOs.Skill;

public class CreateSkillRequest
{
    [Required]
    [StringLength(100)]
    public string SkillName { get; set; } = string.Empty;
}
