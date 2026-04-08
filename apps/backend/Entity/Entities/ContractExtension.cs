using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Entities.Entities;

public class ContractExtension
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int ContractExtensionRequestID { get; set; }

    [StringLength(20)]
    public string RequestedBy { get; set; } = string.Empty;   // GM's UserId

    [StringLength(20)]
    public string UserId { get; set; } = string.Empty;        // Staff's UserId

    public int ExtensionDuration { get; set; }   // In months

    public string ReasonForExtension { get; set; } = string.Empty;

    [StringLength(20)]
    public string Status { get; set; } = "Pending"; // Pending, Approved, Declined

    [StringLength(500)]
    public string? DeclineReason { get; set; }

    public DateTime? ProcessedAt { get; set; }

    [StringLength(20)]
    public string? ProcessedBy { get; set; }

    // Audit fields
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public string UpdatedBy { get; set; } = string.Empty;

    [ForeignKey(nameof(RequestedBy))]
    public virtual User RequestedByUser { get; set; } = default!;

    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = default!;
}
