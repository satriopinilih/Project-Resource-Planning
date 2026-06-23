using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Entities.Entities;

public class Client
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty; // short name, e.g. PT. BGA

    [StringLength(500)]
    public string Description { get; set; } = string.Empty; // e.g. Binus Graduate Attributes

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Audit fields
    public string CreatedBy { get; set; } = string.Empty;   // Stores UserId (varchar)
    public string UpdatedBy { get; set; } = string.Empty;

    // Navigation property
    [InverseProperty(nameof(Holiday.Client))]
    public virtual ICollection<Holiday> Holidays { get; set; } = new List<Holiday>();
}
