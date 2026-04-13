using Commons.Enums;

namespace Contracts.DTOs.User;

public class CreateUserDto
{
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public int DepartmentId { get; set; }
    public EmployeeType EmployeeType { get; set; }
    public int ExperienceYears { get; set; }
    public DateTime ContractStart { get; set; }
    public DateTime ContractEnd { get; set; }
    public List<int> SkillIds { get; set; } = new();
    public List<int> RoleIds { get; set; } = new();
    public List<int> StaffRoleIds { get; set; } = new();
}
