using System.ComponentModel.DataAnnotations;

namespace Contracts.DTOs.Project;

public class AssignMemberRequest
{
    [Required]
    public string UserId { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string RoleInProject { get; set; } = string.Empty;

    /// <summary>
    /// Start date of the member's assignment on this project.
    /// If null, defaults to the project's EstimatedStartDate.
    /// </summary>
    public DateTime? StartDate { get; set; }

    /// <summary>
    /// End date of the member's assignment on this project.
    /// If null, defaults to the project's EstimatedEndDate.
    /// </summary>
    public DateTime? EndDate { get; set; }
}
