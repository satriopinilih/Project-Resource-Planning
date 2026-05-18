using Commons.Enums;
using Contracts.DTOs.Common;
using Entities;
using Entities.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SeedController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public SeedController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<string>>> Seed()
    {
        // if (await _db.Users.AnyAsync())
        // {
        //     return Ok(ApiResponse<string>.SuccessResponse("Already seeded", "Seed skipped"));
        // }
        try
        {
            // if (await _db.Users.AnyAsync())
            // {
            //     return Ok(ApiResponse<string>.SuccessResponse("Already seeded", "Seed skipped"));
            // }

            // Reset data safely without optimistic-concurrency delete issues
            await _db.Database.ExecuteSqlRawAsync(@"
DO $$
DECLARE
    table_name text;
    table_names text[] := ARRAY[
        'ContractExtensions',
        'UserProjects',
        'UserSkills',
        'UserStaffRoles',
        'UserRoles',
        'ProjectRequiredSkills',
        'ProjectRequiredRoles',
        'Projects',
        'Skills',
        'StaffRoles',
        'Roles',
        'Users',
        'Departments'
    ];
BEGIN
    FOREACH table_name IN ARRAY table_names
    LOOP
        IF to_regclass(format('""%s""', table_name)) IS NOT NULL THEN
            EXECUTE format('TRUNCATE TABLE ""%s"" RESTART IDENTITY CASCADE', table_name);
        END IF;
    END LOOP;
END $$;");

            var now = DateTime.UtcNow;

            // Departments
            var baDept = new Department { DepartmentName = "Business Analysis", CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" };
            var engDept = new Department { DepartmentName = "Engineering", CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" };
            var hrDept = new Department { DepartmentName = "Human Resource", CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" };
            _db.Departments.AddRange(baDept, engDept, hrDept);

            // Roles (system roles)
            var roleHr = new Role { RoleName = RoleName.HR };
            var roleGm = new Role { RoleName = RoleName.GM };
            var rolePm = new Role { RoleName = RoleName.PM };
            var roleMrkt = new Role { RoleName = RoleName.Marketing };
            var roleStaff = new Role { RoleName = RoleName.Staff };
            _db.Roles.AddRange(roleHr, roleGm, rolePm, roleMrkt, roleStaff);

            // Staff roles (display roles)
            var srSeniorBA = new StaffRole { RoleName = "Senior BA" };
            var srJuniorBA = new StaffRole { RoleName = "Junior BA" };
            var srSeniorDev = new StaffRole { RoleName = "Senior Dev" };
            var srJuniorDev = new StaffRole { RoleName = "Junior Dev" };
            var srArchitect = new StaffRole { RoleName = "Architect" };
            var srPm = new StaffRole { RoleName = "PM" };
            _db.StaffRoles.AddRange(srSeniorBA, srJuniorBA, srSeniorDev, srJuniorDev, srArchitect, srPm);

            // Skills
            var skills = new[]
            {
                new Skill { SkillName = "Business Analysis" },
                new Skill { SkillName = "Requirements Gathering" },
                new Skill { SkillName = "Stakeholder Management" },
                new Skill { SkillName = "Documentation" },
                new Skill { SkillName = "Testing" },
                new Skill { SkillName = "React" },
                new Skill { SkillName = "Node.js" },
                new Skill { SkillName = "TypeScript" },
                new Skill { SkillName = "System Design" },
                new Skill { SkillName = "Solution Architecture" },
                new Skill { SkillName = "Cloud Design" },
                new Skill { SkillName = "Microservices" },
                new Skill { SkillName = "System Integration" },
                new Skill { SkillName = "Python" },
                new Skill { SkillName = "Django" },
                new Skill { SkillName = "PostgreSQL" },
                new Skill { SkillName = "API Design" },
                new Skill { SkillName = "JavaScript" },
                new Skill { SkillName = "CSS" },
                new Skill { SkillName = "Git" },
                new Skill { SkillName = "Agile" },
                new Skill { SkillName = "Scrum" },
                new Skill { SkillName = "Product Management" }
            };
            _db.Skills.AddRange(skills);

            // Projects (minimal auto-seed)
            var projects = new[]
            {
                new Project {
                    ProjectName = "Digital Transformation Initiative",
                    ClientOrganization = "TechCorp Inc.",
                    ProjectDescription = "Transformation",
                    EstimatedDuration = 13,
                    PriorityLevel = PriorityLevel.High,
                    EstimatedStartDate = new DateTime(2026, 1, 6, 0, 0, 0, DateTimeKind.Utc),
                    EstimatedEndDate = new DateTime(2026, 1, 6, 0, 0, 0, DateTimeKind.Utc).AddMonths(13),
                    ProjectStatus = ProjectStatus.Completed,
                    CreatedAt = now,
                    UpdatedAt = now,
                    CreatedBy = "system",
                    UpdatedBy = "system"
                }
            };
            _db.Projects.AddRange(projects);

            await _db.SaveChangesAsync();

            var users = new[]
            {
                new User { UserId = "HR123", UserName = "HR Manager", Email = "hr.manager@company.com", Password = "password123", DepartmentId = hrDept.DepartementID, EmployeeType = EmployeeType.Permanent, ExperienceYears = 10, ContractStart = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), ContractEnd = new DateTime(2030, 1, 1, 0, 0, 0, DateTimeKind.Utc), ContractStatus = ContractStatus.Active, CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" },
                new User { UserId = "GM001", UserName = "General Manager", Email = "gm@company.com", Password = "password123", DepartmentId = hrDept.DepartementID, EmployeeType = EmployeeType.Permanent, ExperienceYears = 15, ContractStart = new DateTime(2023, 1, 1, 0, 0, 0, DateTimeKind.Utc), ContractEnd = new DateTime(2030, 12, 31, 0, 0, 0, DateTimeKind.Utc), ContractStatus = ContractStatus.Active, CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" },
                new User { UserId = "PM001", UserName = "Project Manager", Email = "pm@company.com", Password = "password123", DepartmentId = engDept.DepartementID, EmployeeType = EmployeeType.Permanent, ExperienceYears = 10, ContractStart = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), ContractEnd = new DateTime(2027, 12, 31, 0, 0, 0, DateTimeKind.Utc), ContractStatus = ContractStatus.Active, CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" },
                new User { UserId = "MKT001", UserName = "Market Manager", Email = "mrkt@company.com", Password = "password123", DepartmentId = hrDept.DepartementID, EmployeeType = EmployeeType.Permanent, ExperienceYears = 15, ContractStart = new DateTime(2023, 1, 1, 0, 0, 0, DateTimeKind.Utc), ContractEnd = new DateTime(2030, 12, 31, 0, 0, 0, DateTimeKind.Utc), ContractStatus = ContractStatus.Active, CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" },

                new User { UserId = "EMP001", UserName = "Sarah Johnson", Email = "sarah.johnson@company.com", Password = "password123", DepartmentId = baDept.DepartementID, EmployeeType = EmployeeType.Permanent, ExperienceYears = 8, ContractStart = new DateTime(2025, 1, 15, 0, 0, 0, DateTimeKind.Utc), ContractEnd = new DateTime(2027, 1, 14, 0, 0, 0, DateTimeKind.Utc), ContractStatus = ContractStatus.Active, CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" },
                new User { UserId = "EMP002", UserName = "Michael Chen", Email = "michael.chen@company.com", Password = "password123", DepartmentId = baDept.DepartementID, EmployeeType = EmployeeType.Contract, ExperienceYears = 3, ContractStart = new DateTime(2025, 3, 1, 0, 0, 0, DateTimeKind.Utc), ContractEnd = new DateTime(2026, 8, 31, 0, 0, 0, DateTimeKind.Utc), ContractStatus = ContractStatus.Active, CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" },
                new User { UserId = "EMP-URGENT", UserName = "John Urgent", Email = "urgent@accelist.com", Password = "password123", DepartmentId = baDept.DepartementID, EmployeeType = EmployeeType.Contract, ExperienceYears = 2, ContractStart = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), ContractEnd = now.AddDays(10), ContractStatus = ContractStatus.Active, CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" },
                new User { UserId = "EMP-EXPIRING", UserName = "Jane Expiring", Email = "expiring@accelist.com", Password = "password123", DepartmentId = baDept.DepartementID, EmployeeType = EmployeeType.Contract, ExperienceYears = 3, ContractStart = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), ContractEnd = now.AddDays(25), ContractStatus = ContractStatus.Active, CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" },
                new User { UserId = "EMP-ACTIVE", UserName = "Bob Active", Email = "active@accelist.com", Password = "password123", DepartmentId = baDept.DepartementID, EmployeeType = EmployeeType.Contract, ExperienceYears = 1, ContractStart = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), ContractEnd = now.AddDays(60), ContractStatus = ContractStatus.Active, CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" }
            };
            _db.Users.AddRange(users);
            await _db.SaveChangesAsync();

            var existingUserIds = await _db.Users
                .Select(u => u.UserId)
                .ToHashSetAsync();

            var byName = skills.ToDictionary(s => s.SkillName, s => s.SkillID);
            var byProject = projects.ToDictionary(p => p.ProjectName, p => p.ProjectID);

            // System roles
            _db.UserRoles.AddRange(
                new UserRole { UserId = "HR123", RoleId = roleHr.RoleId },
                new UserRole { UserId = "GM001", RoleId = roleGm.RoleId },
                new UserRole { UserId = "PM001", RoleId = rolePm.RoleId },
                new UserRole { UserId = "MKT001", RoleId = roleMrkt.RoleId },
                new UserRole { UserId = "EMP001", RoleId = roleStaff.RoleId },
                new UserRole { UserId = "EMP002", RoleId = roleStaff.RoleId },
                new UserRole { UserId = "EMP-URGENT", RoleId = roleStaff.RoleId },
                new UserRole { UserId = "EMP-EXPIRING", RoleId = roleStaff.RoleId },
                new UserRole { UserId = "EMP-ACTIVE", RoleId = roleStaff.RoleId }
            );

            // Staff roles (display)
            _db.UserStaffRoles.AddRange(
                new UserStaffRole { UserId = "EMP001", StaffRoleId = srSeniorBA.StaffRoleId },
                new UserStaffRole { UserId = "EMP002", StaffRoleId = srJuniorBA.StaffRoleId },
                new UserStaffRole { UserId = "PM001", StaffRoleId = srPm.StaffRoleId },
                new UserStaffRole { UserId = "EMP-URGENT", StaffRoleId = srJuniorBA.StaffRoleId },
                new UserStaffRole { UserId = "EMP-EXPIRING", StaffRoleId = srSeniorBA.StaffRoleId },
                new UserStaffRole { UserId = "EMP-ACTIVE", StaffRoleId = srJuniorDev.StaffRoleId }
            );

            // Skill mapping — collect all items then AddRange for batch efficiency
            var allUserSkills = new List<UserSkill>();
            void AddSkills(string userId, params string[] names)
            {
                foreach (var name in names)
                {
                    allUserSkills.Add(new UserSkill { UserId = userId, SkillId = byName[name] });
                }
            }

            AddSkills("EMP001", "Business Analysis", "Requirements Gathering", "Stakeholder Management");
            AddSkills("EMP002", "Business Analysis", "Documentation", "Testing");
            AddSkills("PM001", "Agile", "Scrum", "Product Management");
            AddSkills("EMP-URGENT", "Business Analysis", "Testing");
            AddSkills("EMP-EXPIRING", "Requirements Gathering", "Documentation");
            AddSkills("EMP-ACTIVE", "React", "TypeScript");

            // Use AddRange for skill batch insert
            _db.UserSkills.AddRange(allUserSkills);

            // Project assignments — collect all items then AddRange for batch efficiency
            var allUserProjects = new List<UserProject>();
            var skippedProjectAssignments = new List<string>();
            void AddProject(string userId, string projectName, string roleInProject, UserProjectStatus status)
            {
                if (!existingUserIds.Contains(userId))
                {
                    skippedProjectAssignments.Add($"{userId}:{projectName}");
                    return;
                }

                if (!byProject.TryGetValue(projectName, out var projectId))
                {
                    skippedProjectAssignments.Add($"{userId}:{projectName}");
                    return;
                }

                allUserProjects.Add(new UserProject
                {
                    UserId = userId,
                    ProjectId = projectId,
                    RoleInProject = roleInProject,
                    Status = status
                });
            }

            AddProject("EMP001", "Digital Transformation Initiative", "Senior BA", UserProjectStatus.Completed);
            AddProject("EMP002", "Digital Transformation Initiative", "Junior BA", UserProjectStatus.Completed);
            AddProject("PM001", "Digital Transformation Initiative", "PM", UserProjectStatus.Assigned);

            // Use AddRange for project batch insert
            _db.UserProjects.AddRange(allUserProjects);

            if (skippedProjectAssignments.Count > 0)
            {
                return StatusCode(500, ApiResponse<string>.ErrorResponse(
                    $"Seed failed: Missing references for project assignments ({string.Join(", ", skippedProjectAssignments)})"));
            }

            _db.ContractExtensions.Add(
                new ContractExtension
                {
                    RequestedBy = "HR123",
                    UserId = "EMP002",
                    ExtensionDuration = 24,
                    ReasonForExtension = "Michael Chen has been an exceptional performer and is currently assigned to critical projects. His expertise in Business Analysis and Process Modeling is vital for our upcoming Healthcare Management System project. We strongly recommend extending his contract to ensure project continuity and maintain our high delivery standards.",
                    Status = "Pending",
                    CreatedAt = now,
                    UpdatedAt = now,
                    CreatedBy = "HR123",
                    UpdatedBy = "HR123"
                }
            );

            // ── ProjectRequiredRoles for Digital Transformation Initiative only ──
            var dtiProject = projects.First(p => p.ProjectName == "Digital Transformation Initiative");
            var staffRoleMap = new Dictionary<string, int>
            {
                { "Senior BA",       srSeniorBA.StaffRoleId },
                { "Junior BA",       srJuniorBA.StaffRoleId },
                { "Senior Dev",      srSeniorDev.StaffRoleId },
                { "Junior Dev",      srJuniorDev.StaffRoleId },
                { "Architect",       srArchitect.StaffRoleId },
                { "PM", srPm.StaffRoleId },
            };

            _db.ProjectRequiredRoles.AddRange(
                // ── Digital Transformation Initiative ──
                new ProjectRequiredRole { ProjectID = dtiProject.ProjectID, StaffRoleId = staffRoleMap["Senior BA"], RequiredCount = 1, WorkingType = WorkingType.Dedicated },
                new ProjectRequiredRole { ProjectID = dtiProject.ProjectID, StaffRoleId = staffRoleMap["Junior BA"], RequiredCount = 1, WorkingType = WorkingType.Dedicated },
                new ProjectRequiredRole { ProjectID = dtiProject.ProjectID, StaffRoleId = staffRoleMap["Senior Dev"], RequiredCount = 1, WorkingType = WorkingType.Dedicated },
                new ProjectRequiredRole { ProjectID = dtiProject.ProjectID, StaffRoleId = staffRoleMap["PM"], RequiredCount = 1, WorkingType = WorkingType.NonDedicated }
            );

            // ── Project-level Required Skills ──
            var projectSkillNames = new[] { "Business Analysis", "Requirements Gathering", "Testing", "Documentation" };
            var projectRequiredSkills = projectSkillNames
                .Where(skillName => byName.ContainsKey(skillName))
                .Select(skillName => new ProjectRequiredSkill { ProjectId = dtiProject.ProjectID, SkillId = byName[skillName] })
                .ToList();
            _db.ProjectRequiredSkills.AddRange(projectRequiredSkills);

            await _db.SaveChangesAsync();

            return Ok(ApiResponse<string>.SuccessResponse("Seed completed", "Database seeded"));
        }
        catch (Exception ex)
        {
            var detail = ex.InnerException?.Message ?? ex.Message;
            return StatusCode(500, ApiResponse<string>.ErrorResponse($"Seed failed: {detail}"));
        }
    }
}
