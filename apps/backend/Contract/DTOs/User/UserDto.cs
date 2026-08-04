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
    /// <summary>True if this junior employee is tagged as an intern by HR.</summary>
    public bool IsIntern { get; set; } = false;
    /// <summary>True if this employee has self-reported as not available for WFO.</summary>
    public bool IsNotAvailableWfo { get; set; } = false;
    public DateTime ContractStart { get; set; }
    public DateTime ContractEnd { get; set; }
    public ContractStatus ContractStatus { get; set; }
    public int DaysRemaining { get; set; }
    public List<string> Skills { get; set; } = new();
    public List<string> Roles { get; set; } = new();
    public List<UserProjectDto> Projects { get; set; } = new();
    /// <summary>Contract history (original + extensions), sorted newest first by StartDate.</summary>
    public List<ContractHistoryDto> ContractHistory { get; set; } = new();
    /// <summary>Role/position history, sorted newest first. Includes current role.</summary>
    public List<RoleHistoryDto> RoleHistories { get; set; } = new();
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
    /// <summary>Human-readable duration, e.g. "2 years", "6 months".</summary>
    public string Duration { get; set; } = string.Empty;
    /// <summary>Date when this period was created/extended. Null for the original contract.</summary>
    public DateTime? ExtendedOn { get; set; }
    /// <summary>Name of the person who created/extended this contract period. Null for original.</summary>
    public string? ExtendedBy { get; set; }
    /// <summary>Days remaining until this period's EndDate. Only meaningful for the active period.</summary>
    public int? DaysUntilExpiry { get; set; }
}

public class RoleHistoryDto
{
    /// <summary>Role/position name (e.g. "Junior Dev", "Senior BA").</summary>
    public string RoleName { get; set; } = string.Empty;
    /// <summary>Date this role became effective.</summary>
    public DateTime StartDate { get; set; }
    /// <summary>Date this role ended. Null if this is the current role.</summary>
    public DateTime? EndDate { get; set; }
    /// <summary>True if this is the employee's currently active role.</summary>
    public bool IsCurrentRole { get; set; }
    /// <summary>Human-readable duration in this role, e.g. "1 year, 3 months".</summary>
    public string Duration { get; set; } = string.Empty;
}
