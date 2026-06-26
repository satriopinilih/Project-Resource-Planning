using System.Collections.Generic;

namespace Contracts.DTOs.User;

public class NotificationResponseDto
{
    public bool HasUnread { get; set; }
    public int Count { get; set; }
    public List<UserProjectDto> Notifications { get; set; } = new();
}
