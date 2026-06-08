using System.ComponentModel.DataAnnotations;

namespace Contracts.DTOs.Holiday;

public class UpdateHolidayRequest
{
    [Required]
    [StringLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public DateTime Date { get; set; }
}
