using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Commons.Enums;
using Entities.Entities;

namespace Entities.Entities;

public class User
{
    [Key]
    [StringLength(20)]
    public string UserId { get; set; } = string.Empty;   // e.g., MKT001, ENG002

    [StringLength(100)]
    public string UserName { get; set; } = string.Empty;

    [StringLength(255)]
    public string Email { get; set; } = string.Empty;

    [StringLength(255)]
    public string Password { get; set; } = string.Empty;

    public int DepartmentId { get; set; }

    public EmployeeType EmployeeType { get; set; }

    public int ExperienceYears { get; set; }

    /// <summary>
    /// Marks a junior employee as an intern. Independent of contract system.
    /// Controlled by HR only.
    /// </summary>
    public bool IsIntern { get; set; } = false;

    /// <summary>
    /// Indicates that this employee has marked themselves as not available for WFO (Work From Office).
    /// Set by the employee themselves via PATCH /api/employees/me/wfo-status.
    /// Used as a warning signal to GM when starting a project with this member.
    /// </summary>
    public bool IsNotAvailableWfo { get; set; } = false;

    public DateTime ContractStart { get; set; }
    public DateTime ContractEnd { get; set; }
    public ContractStatus ContractStatus { get; set; }

    // Audit fields
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public string UpdatedBy { get; set; } = string.Empty;

    // Navigation properties
    [ForeignKey(nameof(DepartmentId))]
    public virtual Department Department { get; set; } = default!;

    [InverseProperty(nameof(UserRole.User))]
    public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();

    [InverseProperty(nameof(UserStaffRole.User))]
    public virtual ICollection<UserStaffRole> UserStaffRoles { get; set; } = new List<UserStaffRole>();

    [InverseProperty(nameof(UserSkill.User))]
    public virtual ICollection<UserSkill> UserSkills { get; set; } = new List<UserSkill>();

    [InverseProperty(nameof(UserProject.User))]
    public virtual ICollection<UserProject> UserProjects { get; set; } = new List<UserProject>();

    [InverseProperty(nameof(ContractExtension.RequestedByUser))]
    public virtual ICollection<ContractExtension> RequestedExtensions { get; set; } = new List<ContractExtension>();

    [InverseProperty(nameof(ContractExtension.User))]
    public virtual ICollection<ContractExtension> UserExtensions { get; set; } = new List<ContractExtension>();

    [InverseProperty(nameof(EmployeeRoleHistory.User))]
    public virtual ICollection<EmployeeRoleHistory> RoleHistories { get; set; } = new List<EmployeeRoleHistory>();
}