using System;

namespace Contracts.DTOs.Client;

public class ClientDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int TotalHolidayDays { get; set; }
    public string UpcomingHoliday { get; set; } = string.Empty; // e.g., "No upcoming holiday" or "Dec 31, 2026"
    public int LongestHolidayDays { get; set; }
    public DateTime LastUpdated { get; set; }
}
