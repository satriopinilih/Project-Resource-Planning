using Commons.Enums;

namespace Contracts.DTOs.Project;

public class ProjectDto
{
    public int ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string ClientOrganization { get; set; } = string.Empty;
    public string ProjectDescription { get; set; } = string.Empty;
    public int EstimatedDuration { get; set; } // in weeks
    public PriorityLevel PriorityLevel { get; set; }
    public DateTime EstimatedStartDate { get; set; }
    public DateTime EstimatedEndDate { get; set; }
    public ProjectStatus ProjectStatus { get; set; }
    public bool IsUnread { get; set; }
    public List<ProjectMemberDto> Members { get; set; } = new();
    public List<ProjectRequiredRoleDto> RequiredRoles { get; set; } = new();
    public List<string> RequiredSkills { get; set; } = new(); // Project-level skill requirements
}

public class ProjectMemberDto
{
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string StaffRole { get; set; } = string.Empty;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string Status { get; set; } = "Assigned";
}

public class ProjectRequiredRoleDto
{
    public int Id { get; set; }
    public int StaffRoleId { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public int RequiredCount { get; set; }
    public string WorkingType { get; set; } = "Dedicated";
    public int FilledCount { get; set; }
}
