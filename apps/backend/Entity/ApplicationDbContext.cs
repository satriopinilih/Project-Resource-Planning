using Microsoft.EntityFrameworkCore;
using Entities.Entities;
using Commons.Enums;

namespace Entities;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Role> Roles { get; set; }
    public DbSet<UserRole> UserRoles { get; set; }
    public DbSet<StaffRole> StaffRoles { get; set; }
    public DbSet<UserStaffRole> UserStaffRoles { get; set; }
    public DbSet<Skill> Skills { get; set; }
    public DbSet<UserSkill> UserSkills { get; set; }
    public DbSet<Department> Departments { get; set; }
    public DbSet<Project> Projects { get; set; }
    public DbSet<UserProject> UserProjects { get; set; }
    public DbSet<ProjectRequiredRole> ProjectRequiredRoles { get; set; }
    public DbSet<ProjectRequiredSkill> ProjectRequiredSkills { get; set; }
    public DbSet<ContractExtension> ContractExtensions { get; set; }
    public DbSet<HireRequest> HireRequests { get; set; }
    public DbSet<Holiday> Holidays { get; set; }
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure enum to string conversion (optional, but recommended for readability)
        modelBuilder.Entity<User>()
            .Property(u => u.EmployeeType)
            .HasConversion<string>();

        modelBuilder.Entity<User>()
            .Property(u => u.ContractStatus)
            .HasConversion<string>();

        modelBuilder.Entity<Project>()
            .Property(p => p.PriorityLevel)
            .HasConversion<string>();

        modelBuilder.Entity<Project>()
            .Property(p => p.ProjectStatus)
            .HasConversion<string>();

        modelBuilder.Entity<ProjectRequiredRole>()
            .Property(pr => pr.WorkingType)
            .HasConversion<string>();

        modelBuilder.Entity<UserProject>()
            .Property(up => up.Status)
            .HasConversion<string>();

        modelBuilder.Entity<Role>()
            .Property(r => r.RoleName)
            .HasConversion<string>();

        // Unique constraints / indexes
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<Department>()
            .HasIndex(d => d.DepartmentName)
            .IsUnique();

        modelBuilder.Entity<Skill>()
            .HasIndex(s => s.SkillName)
            .IsUnique();

        modelBuilder.Entity<StaffRole>()
            .HasIndex(sr => sr.RoleName)
            .IsUnique();

        // Set default values for audit timestamps (optional, handled in SaveChanges override)
        modelBuilder.Entity<User>()
            .Property(u => u.CreatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        modelBuilder.Entity<User>()
            .Property(u => u.UpdatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        modelBuilder.Entity<Department>()
            .Property(d => d.CreatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        modelBuilder.Entity<Department>()
            .Property(d => d.UpdatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        modelBuilder.Entity<Project>()
            .Property(p => p.CreatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        modelBuilder.Entity<Project>()
            .Property(p => p.UpdatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        modelBuilder.Entity<ContractExtension>()
            .Property(ce => ce.CreatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        modelBuilder.Entity<ContractExtension>()
            .Property(ce => ce.UpdatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        modelBuilder.Entity<ContractExtension>()
            .Property(ce => ce.Status)
            .HasDefaultValue("Pending");

        modelBuilder.Entity<HireRequest>()
            .Property(hr => hr.CreatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        modelBuilder.Entity<HireRequest>()
            .Property(hr => hr.UpdatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        modelBuilder.Entity<HireRequest>()
            .Property(hr => hr.Status)
            .HasDefaultValue("Open");

        modelBuilder.Entity<Holiday>().HasData(
            new Holiday { Id = 1, Name = "New Year's Day", Date = DateTime.SpecifyKind(new DateTime(2026, 1, 1), DateTimeKind.Utc) },
            new Holiday { Id = 2, Name = "Good Friday", Date = DateTime.SpecifyKind(new DateTime(2026, 4, 3), DateTimeKind.Utc) },
            new Holiday { Id = 3, Name = "Easter Sunday", Date = DateTime.SpecifyKind(new DateTime(2026, 4, 5), DateTimeKind.Utc) },
            new Holiday { Id = 4, Name = "Labour Day", Date = DateTime.SpecifyKind(new DateTime(2026, 5, 1), DateTimeKind.Utc) },
            new Holiday { Id = 5, Name = "Independence Day", Date = DateTime.SpecifyKind(new DateTime(2026, 8, 17), DateTimeKind.Utc) },
            new Holiday { Id = 6, Name = "Christmas Day", Date = DateTime.SpecifyKind(new DateTime(2026, 12, 25), DateTimeKind.Utc) }
        );
    }

    // Optional: Override SaveChanges to automatically set audit fields
    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var entries = ChangeTracker.Entries()
            .Where(e => e.Entity is IAuditable &&
                        (e.State == EntityState.Added || e.State == EntityState.Modified));

        foreach (var entry in entries)
        {
            if (entry.State == EntityState.Added)
            {
                ((IAuditable)entry.Entity).CreatedAt = DateTime.UtcNow;
                ((IAuditable)entry.Entity).CreatedBy = GetCurrentUserId(); // implement your logic
            }
            ((IAuditable)entry.Entity).UpdatedAt = DateTime.UtcNow;
            ((IAuditable)entry.Entity).UpdatedBy = GetCurrentUserId();
        }

        return await base.SaveChangesAsync(cancellationToken);
    }

    private string GetCurrentUserId() => "system"; // Replace with actual user resolution later
}

// Optional interface for audit (place in same file or separate)
public interface IAuditable
{
    DateTime CreatedAt { get; set; }
    DateTime UpdatedAt { get; set; }
    string CreatedBy { get; set; }
    string UpdatedBy { get; set; }
}
