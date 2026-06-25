using System.Collections.Generic;

namespace Contracts.DTOs.User;

public class UpdateEmployeeSkillsRequest
{
    public List<int> SkillIds { get; set; } = new();
}
