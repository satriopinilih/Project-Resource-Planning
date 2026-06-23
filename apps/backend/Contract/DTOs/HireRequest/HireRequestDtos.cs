namespace Contracts.DTOs.HireRequest;

public class CreateHireRequestDto
{
    public int? ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string RoleNeeded { get; set; } = string.Empty;
    public int Quantity { get; set; } = 1;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Notes { get; set; } = string.Empty;
}

public class UpdateHireRequestStatusDto
{
    public string? HiredEmployeeName { get; set; }
    public string? Notes { get; set; }
    public string? Status { get; set; }
}

public class HireRequestDto
{
    public int HireRequestId { get; set; }
    public string RequestedBy { get; set; } = string.Empty;
    public int? ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string RoleNeeded { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Notes { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? HiredEmployeeName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? FulfilledAt { get; set; }
}
