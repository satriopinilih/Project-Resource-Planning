namespace Contracts.DTOs.ContractExtension;

public class ContractExtensionRecommendationDto
{
    /// <summary>Whether a valid auto-recommendation exists (i.e., at least one active project exceeds the contract end date).</summary>
    public bool HasRecommendation { get; set; }

    /// <summary>List of active projects the employee is currently assigned to.</summary>
    public List<ActiveProjectInfo> ActiveProjects { get; set; } = new();

    /// <summary>Recommended extension duration in full months (Math.Ceiling of the diff), null if no recommendation.</summary>
    public int? RecommendedDurationMonths { get; set; }

    /// <summary>Exact date of the latest project end date (used as recommended contract end date), null if no recommendation.</summary>
    public DateTime? RecommendedEndDate { get; set; }

    /// <summary>Auto-generated justification text, null if no recommendation.</summary>
    public string? JustificationText { get; set; }

    /// <summary>The employee's current contract end date (used for calculations on the frontend).</summary>
    public DateTime CurrentContractEnd { get; set; }
}

public class ActiveProjectInfo
{
    public string ProjectName { get; set; } = string.Empty;
    public DateTime? EstEndDate { get; set; }
    /// <summary>True if this project has the latest end date among all active projects.</summary>
    public bool IsLatest { get; set; }
}
