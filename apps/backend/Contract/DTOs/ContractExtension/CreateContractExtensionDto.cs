namespace Contracts.DTOs.ContractExtension;

public class CreateContractExtensionDto
{
    public string UserId { get; set; } = string.Empty;
    public int ExtensionDuration { get; set; }
    public string ReasonForExtension { get; set; } = string.Empty;
    /// <summary>
    /// When set (auto-rec mode), ApproveAsync will use this exact date as the new ContractEnd
    /// instead of computing ContractEnd + ExtensionDuration months.
    /// </summary>
    public DateTime? ExpectedEndDate { get; set; }
    /// <summary>
    /// Optional: new role/position for the employee (e.g., promotion).
    /// If null or matches current role, no role change is processed.
    /// </summary>
    public string? NewRole { get; set; }
}

public class ApproveContractExtensionDto
{
    public int ContractExtensionRequestID { get; set; }
}

public class DeclineContractExtensionDto
{
    public int ContractExtensionRequestID { get; set; }
    public string DeclineReason { get; set; } = string.Empty;
}
