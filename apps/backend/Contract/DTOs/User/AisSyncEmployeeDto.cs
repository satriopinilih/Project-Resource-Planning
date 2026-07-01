using System;

namespace Contracts.DTOs.User;

public class AisSyncEmployeeDto
{
    public string EmployeeId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? RoleName { get; set; }
    public string? PositionName { get; set; }
    public string? EmployeeTypeName { get; set; }
    public DateTime? JoinDate { get; set; }
    public DateTime? EndContractDate { get; set; }
}
