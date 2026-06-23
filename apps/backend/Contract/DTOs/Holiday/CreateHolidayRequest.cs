using System.ComponentModel.DataAnnotations;

namespace Contracts.DTOs.Holiday;

public class CreateHolidayRequest
{
    [Required]
    [StringLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public DateTime StartDate { get; set; }

    [Required]
    public DateTime EndDate { get; set; }

    public int? ClientId { get; set; }
}
