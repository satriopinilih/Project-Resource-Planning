using System.ComponentModel.DataAnnotations;

/// <summary>
/// Request body for PATCH /api/projects/{id}/roles/{roleId}/count
/// Allows the GM to change the required headcount for a specific role on a project.
/// </summary>
public class UpdateRoleCountRequest
{
    [Range(1, 100, ErrorMessage = "Count must be between 1 and 100.")]
    public int NewCount { get; set; }
}
