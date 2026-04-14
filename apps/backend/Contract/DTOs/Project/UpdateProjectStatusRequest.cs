using Commons.Enums;
using System.ComponentModel.DataAnnotations;

namespace Contracts.DTOs.Project;

public class UpdateProjectStatusRequest
{
    [Required]
    public ProjectStatus ProjectStatus { get; set; }
}
