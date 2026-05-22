namespace Contracts.DTOs.Project;

public class SwapMemberRequest
{
    public string OldUserId { get; set; } = string.Empty;
    public string NewUserId { get; set; } = string.Empty;
    public string? Reason { get; set; }
}
