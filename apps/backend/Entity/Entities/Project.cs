using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Commons.Enums;

namespace Entities.Entities;

public class Project
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int ProjectID { get; set; }

    [StringLength(200)]
    public string ProjectName { get; set; } = string.Empty;

    [StringLength(200)]
    public string ClientOrganization { get; set; } = string.Empty;

    public string ProjectDescription { get; set; } = string.Empty;

    public int EstimatedDuration { get; set; }   // In weeks

    public PriorityLevel PriorityLevel { get; set; }

    public DateTime EstimatedStartDate { get; set; }

    public ProjectStatus ProjectStatus { get; set; }

    // Audit fields
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public string UpdatedBy { get; set; } = string.Empty;

    // Navigation properties
    [InverseProperty(nameof(UserProject.Project))]
    public virtual ICollection<UserProject> UserProjects { get; set; } = new List<UserProject>();

    [InverseProperty(nameof(ProjectRequiredRole.Project))]
    public virtual ICollection<ProjectRequiredRole> ProjectRequiredRoles { get; set; } = new List<ProjectRequiredRole>();
}