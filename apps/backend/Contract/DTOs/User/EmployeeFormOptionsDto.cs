namespace Contracts.DTOs.User;

public class EmployeeFormOptionsDto
{
    public List<LookupItemDto> Departments { get; set; } = new();
    public List<LookupItemDto> Skills { get; set; } = new();
    public List<LookupItemDto> Roles { get; set; } = new();
    public List<LookupItemDto> StaffRoles { get; set; } = new();
}

public class LookupItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}
