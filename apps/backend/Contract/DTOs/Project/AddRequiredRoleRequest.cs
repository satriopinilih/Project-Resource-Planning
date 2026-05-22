using Commons.Enums;
using System.ComponentModel.DataAnnotations;

namespace Contracts.DTOs.Project;

/// <summary>
/// Request body for POST /api/projects/{id}/roles
/// Allows the GM to add a new required role to an existing project.
/// </summary>
public class AddRequiredRoleRequest
{
    [Required(ErrorMessage = "Role name is required.")]
    public string RoleName { get; set; } = string.Empty;

    [Range(1, 100, ErrorMessage = "Count must be between 1 and 100.")]
    public int Count { get; set; } = 1;

    public WorkingType WorkingType { get; set; } = WorkingType.Dedicated;
}
