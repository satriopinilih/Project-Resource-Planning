namespace Contracts.DTOs.User;

public class CreateUserResultDto
{
    public UserDto User { get; set; } = new();
    public string TemporaryPassword { get; set; } = string.Empty;
    public bool MustChangePassword { get; set; } = true;
}
