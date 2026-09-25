using System.ComponentModel.DataAnnotations;

namespace Contracts.DTOs.ProjectPhase;

public class CreateProjectPhaseRequest
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;
}
