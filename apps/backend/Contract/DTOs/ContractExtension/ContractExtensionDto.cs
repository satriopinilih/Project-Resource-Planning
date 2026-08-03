namespace Contracts.DTOs.ContractExtension;

public class ContractExtensionDto
{
    public int ContractExtensionRequestID { get; set; }
    public string RequestedBy { get; set; } = string.Empty;
    public string RequestedByName { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public int ExtensionDuration { get; set; }
    public string ReasonForExtension { get; set; } = string.Empty;
    /// <summary>New role/position requested by GM. Null = no role change.</summary>
    public string? NewRole { get; set; }
    public DateTime CreatedAt { get; set; }
    public string Status { get; set; } = "Pending"; // Pending, Approved, Declined
}
