using Commons.Enums;
using System.ComponentModel.DataAnnotations;

namespace Contracts.DTOs.Project;

public class UpdateProjectRequest
{
    [StringLength(200)]
    public string? ProjectName { get; set; }

    [StringLength(200)]
    public string? ClientOrganization { get; set; }

    public string? ProjectDescription { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Duration must be at least 1 week.")]
    public int? EstimatedDuration { get; set; }

    public PriorityLevel? PriorityLevel { get; set; }

    public DateTime? EstimatedStartDate { get; set; }

    public DateTime? EstimatedEndDate { get; set; }

    public int? BabysittingDuration { get; set; }
    public int? WarrantyDuration { get; set; }
    public DateTime? BabysittingStartDate { get; set; }
    public DateTime? BabysittingEndDate { get; set; }
    public DateTime? WarrantyStartDate { get; set; }
    public DateTime? WarrantyEndDate { get; set; }

    public ProjectStatus? ProjectStatus { get; set; }

    public List<CreateProjectRoleDto>? RequiredRoles { get; set; }

    public List<int>? RequiredSkillIds { get; set; }
}
