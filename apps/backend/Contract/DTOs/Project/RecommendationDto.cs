namespace Contracts.DTOs.Project;

/// <summary>
/// The response DTO for the Smart Recommendation Panel.
/// Contains the project's required roles, required skills, and two recommended team options.
/// </summary>
public class RecommendationResponse
{
    public int ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public DateTime EstimatedStartDate { get; set; }
    public DateTime EstimatedEndDate { get; set; }
    public List<RequiredRoleDto> RequiredRoles { get; set; } = new();
    public List<string> RequiredSkills { get; set; } = new(); // Project-level skills
    public RecommendationOption OptionA { get; set; } = new();
    public RecommendationOption OptionB { get; set; } = new();
    public string BestOption { get; set; } = "A"; // "A" or "B"
    public string BestOptionReason { get; set; } = string.Empty;
}

public class RequiredRoleDto
{
    public int StaffRoleId { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public int RequiredCount { get; set; }
    public string WorkingType { get; set; } = "Dedicated";
}

public class RecommendationOption
{
    public string Title { get; set; } = string.Empty;
    public string Timeline { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int TeamSize { get; set; }
    public int AvailableNow { get; set; }
    public bool RequiresHiring { get; set; }
    public string HiringDetail { get; set; } = string.Empty;
    public bool RequiresReschedule { get; set; }
    public string RescheduleDetail { get; set; } = string.Empty;
    public double MatchScore { get; set; } // 0-100
    public List<CandidateDto> Candidates { get; set; } = new();
}

public class PastProjectExperience
{
    public string ProjectName { get; set; } = string.Empty;
    public string RoleInProject { get; set; } = string.Empty;
    public List<string> ProjectSkills { get; set; } = new(); // Required skills of that past project
}

public class CandidateDto
{
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string StaffRole { get; set; } = string.Empty;
    public string TargetRole { get; set; } = string.Empty; // The role they'd fill
    public string TargetWorkingType { get; set; } = string.Empty; // e.g. "Dedicated" or "NonDedicated"
    public int ExperienceYears { get; set; }
    public List<string> Skills { get; set; } = new();
    public List<string> MatchedSkills { get; set; } = new(); // Skills from past projects that match target project
    public double SkillMatchPercent { get; set; } // 0-100
    public bool IsAvailable { get; set; }
    public string AvailabilityNote { get; set; } = string.Empty; // e.g., "Available from May 28"
    public List<string> CurrentProjects { get; set; } = new();
    public List<PastProjectExperience> PastProjects { get; set; } = new(); // Projects they've worked on
}
