namespace Contracts.DTOs.RequestHistory;

public class RequestHistoryItemDto
{
    public string RequestType { get; set; } = string.Empty;
    public string ReferenceId { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string StaffRole { get; set; } = string.Empty;
    public string Extension { get; set; } = "-";
    public DateTime RequestedDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? ReviewedDate { get; set; }
}
