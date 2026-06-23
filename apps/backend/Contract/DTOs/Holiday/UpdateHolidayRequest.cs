using System.ComponentModel.DataAnnotations;

namespace Contracts.DTOs.Holiday;

public class UpdateHolidayRequest
{
    [Required]
    [StringLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public DateTime DateStart { get; set; }

    [Required]
    public DateTime DateEnd { get; set; }

    public int? ClientId { get; set; }
}
