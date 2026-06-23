using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Entities.Entities;

public class HireRequest
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int HireRequestId { get; set; }

    [StringLength(20)]
    public string RequestedBy { get; set; } = string.Empty;

    public int? ProjectId { get; set; }

    [StringLength(200)]
    public string ProjectName { get; set; } = string.Empty;

    [StringLength(120)]
    public string RoleNeeded { get; set; } = string.Empty;

    public int Quantity { get; set; } = 1;

    [StringLength(50)]
    public string? ExperienceYearsRange { get; set; }

    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }

    [StringLength(1000)]
    public string Notes { get; set; } = string.Empty;

    [StringLength(20)]
    public string Status { get; set; } = "Open"; // Open, InProgress, Fulfilled

    [StringLength(120)]
    public string? HiredEmployeeName { get; set; }

    [StringLength(20)]
    public string? FulfilledBy { get; set; }

    public DateTime? FulfilledAt { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public string UpdatedBy { get; set; } = string.Empty;
}
