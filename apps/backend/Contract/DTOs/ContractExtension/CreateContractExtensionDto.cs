namespace Contracts.DTOs.ContractExtension;

public class CreateContractExtensionDto
{
    public string UserId { get; set; } = string.Empty;
    public int ExtensionDuration { get; set; }
    public string ReasonForExtension { get; set; } = string.Empty;
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
