using Commons.Enums;

namespace Contracts.DTOs.User;

public class UserDto
{
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public EmployeeType EmployeeType { get; set; }
    public int ExperienceYears { get; set; }
    public DateTime ContractStart { get; set; }
    public DateTime ContractEnd { get; set; }
    public ContractStatus ContractStatus { get; set; }
    public int DaysRemaining { get; set; }
    public List<string> Skills { get; set; } = new();
    public List<string> Roles { get; set; } = new();
    public List<UserProjectDto> Projects { get; set; } = new();
}

public class UserProjectDto
{
    public int ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string ClientOrganization { get; set; } = string.Empty;
    public string RoleInProject { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public UserProjectStatus Status { get; set; }
    public ProjectStatus? ProjectStatus { get; set; }
    public bool IsUnread { get; set; }
    public string? SwapReason { get; set; }
}
