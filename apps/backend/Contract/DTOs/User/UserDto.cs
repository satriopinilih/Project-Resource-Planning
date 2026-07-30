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
    /// <summary>Contract history (original + extensions), sorted newest first by StartDate.</summary>
    public List<ContractHistoryDto> ContractHistory { get; set; } = new();
}

public class UserProjectDto
{
    public int UserProjectId { get; set; }
    public int? ProjectId { get; set; }
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

public class ContractHistoryDto
{
    /// <summary>Start date of this contract period.</summary>
    public DateTime StartDate { get; set; }
    /// <summary>End date of this contract period. Null for an active/open-ended contract.</summary>
    public DateTime? EndDate { get; set; }
    /// <summary>Staff role during this period (e.g. "Junior Dev").</summary>
    public string Role { get; set; } = string.Empty;
    /// <summary>True if this is the currently active contract.</summary>
    public bool IsActive { get; set; }
}
