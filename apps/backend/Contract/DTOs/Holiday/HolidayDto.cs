namespace Contracts.DTOs.Holiday;

public class HolidayDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime DateStart { get; set; }
    public DateTime DateEnd { get; set; }
    public int? ClientId { get; set; }
    public string? ClientName { get; set; }
}
