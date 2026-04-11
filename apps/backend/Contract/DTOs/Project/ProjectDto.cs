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
}

public class ProjectMemberDto
{
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string StaffRole { get; set; } = string.Empty;
}
