using Commons.Enums;
using System.ComponentModel.DataAnnotations;
namespace Contracts.DTOs.Project;

public class CreateProjectRequest
{
    [Required]
    [StringLength(200)]
    public string ProjectName { get; set; } = string.Empty;

    [Required]
    [StringLength(200)]
    public string ClientOrganization { get; set; } = string.Empty;

    public string ProjectDescription { get; set; } = string.Empty;

    [Range(1, int.MaxValue, ErrorMessage = "Duration must be at least 1 week.")]
    public int EstimatedDuration { get; set; }

    public PriorityLevel PriorityLevel { get; set; }

    public DateTime EstimatedStartDate { get; set; }

    public DateTime EstimatedEndDate { get; set; }

    public List<CreateProjectRoleDto> RequiredRoles { get; set; } = new List<CreateProjectRoleDto>();
}

public class CreateProjectRoleDto
{
    [Required]
    public string RoleName { get; set; } = string.Empty;

    public int Count { get; set; }

    public WorkingType WorkingType { get; set; }
}