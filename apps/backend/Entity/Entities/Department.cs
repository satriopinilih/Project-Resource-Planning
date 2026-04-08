using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Entities.Entities;

public class Department
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int DepartementID { get; set; }

    [StringLength(100)]
    public string DepartmentName { get; set; } = string.Empty;

    // Audit fields
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;   // Stores UserId (varchar)
    public string UpdatedBy { get; set; } = string.Empty;

    // Navigation property
    [InverseProperty(nameof(User.Department))]
    public virtual ICollection<User> Users { get; set; } = new List<User>();
}