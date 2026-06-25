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

            // Projects (CreatedAt set to ~2 weeks before each project's start date for realistic seed data)
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
                    CreatedAt = new DateTime(2025, 12, 20, 9, 0, 0, DateTimeKind.Utc), 
                    UpdatedAt = now, 
                    CreatedBy = "system", 
                    UpdatedBy = "system" 
                },
                new Project { 
                    ProjectName = "Customer Portal Development", 
                    ClientOrganization = "RetailMax Ltd.", 
                    ProjectDescription = "Portal", 
                    EstimatedDuration = 8, 
                    PriorityLevel = PriorityLevel.Medium, 
                    EstimatedStartDate = new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc), 
                    EstimatedEndDate = new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(8),
                    ProjectStatus = ProjectStatus.Running, 
                    CreatedAt = new DateTime(2026, 3, 15, 10, 30, 0, DateTimeKind.Utc), 
                    UpdatedAt = now, 
                    CreatedBy = "system", 
                    UpdatedBy = "system" 
                },
                new Project { 
                    ProjectName = "E-commerce Platform Rebuild", 
                    ClientOrganization = "ShopHub Co.", 
                    ProjectDescription = "Rebuild", 
                    EstimatedDuration = 21, 
                    PriorityLevel = PriorityLevel.High, 
                    EstimatedStartDate = new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc), 
                    EstimatedEndDate = new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(21),
                    ProjectStatus = ProjectStatus.Running, 
                    CreatedAt = new DateTime(2026, 1, 15, 14, 0, 0, DateTimeKind.Utc), 
                    UpdatedAt = now, 
                    CreatedBy = "system", 
                    UpdatedBy = "system" 
                },
                new Project { 
                    ProjectName = "Cloud Migration Project", 
                    ClientOrganization = "FinanceFirst Bank", 
                    ProjectDescription = "Migration", 
                    EstimatedDuration = 26, 
                    PriorityLevel = PriorityLevel.High, 
                    EstimatedStartDate = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc), 
                    EstimatedEndDate = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(26),
                    ProjectStatus = ProjectStatus.Running, 
                    CreatedAt = new DateTime(2026, 2, 12, 11, 0, 0, DateTimeKind.Utc), 
                    UpdatedAt = now, 
                    CreatedBy = "system", 
                    UpdatedBy = "system" 
                },
                new Project { 
                    ProjectName = "Analytics Dashboard", 
                    ClientOrganization = "DataInsights Corp.", 
                    ProjectDescription = "Analytics", 
                    EstimatedDuration = 15, 
                    PriorityLevel = PriorityLevel.Medium, 
                    EstimatedStartDate = new DateTime(2026, 1, 15, 0, 0, 0, DateTimeKind.Utc), 
                    EstimatedEndDate = new DateTime(2026, 1, 15, 0, 0, 0, DateTimeKind.Utc).AddMonths(15),
                    ProjectStatus = ProjectStatus.Completed, 
                    CreatedAt = new DateTime(2025, 12, 28, 8, 45, 0, DateTimeKind.Utc), 
                    UpdatedAt = now, 
                    CreatedBy = "system", 
                    UpdatedBy = "system" 
                },
                new Project { 
                    ProjectName = "Internal Tools Dashboard", 
                    ClientOrganization = "Internal", 
                    ProjectDescription = "Internal tools", 
                    EstimatedDuration = 14, 
                    PriorityLevel = PriorityLevel.Medium, 
                    EstimatedStartDate = new DateTime(2026, 3, 15, 0, 0, 0, DateTimeKind.Utc), 
                    EstimatedEndDate = new DateTime(2026, 3, 15, 0, 0, 0, DateTimeKind.Utc).AddMonths(14),
                    ProjectStatus = ProjectStatus.Running, 
                    CreatedAt = new DateTime(2026, 3, 1, 15, 20, 0, DateTimeKind.Utc), 
                    UpdatedAt = now, 
                    CreatedBy = "system", 
                    UpdatedBy = "system" 
                },
                new Project { 
                    ProjectName = "Mobile App Launch", 
                    ClientOrganization = "TravelEase Inc.", 
                    ProjectDescription = "Mobile launch", 
                    EstimatedDuration = 14, 
                    PriorityLevel = PriorityLevel.High, 
                    EstimatedStartDate = new DateTime(2026, 2, 10, 0, 0, 0, DateTimeKind.Utc), 
                    EstimatedEndDate = new DateTime(2026, 2, 10, 0, 0, 0, DateTimeKind.Utc).AddMonths(14),
                    ProjectStatus = ProjectStatus.Running, 
                    CreatedAt = new DateTime(2026, 1, 25, 13, 10, 0, DateTimeKind.Utc), 
                    UpdatedAt = now, 
                    CreatedBy = "system", 
                    UpdatedBy = "system" 
                },
                // ── TEST PROJECT for Smart Recommendation Panel ──
                new Project { 
                    ProjectName = "Healthcare Management System", 
                    ClientOrganization = "MediCare Solutions", 
                    ProjectDescription = "Build an integrated healthcare management platform with patient tracking, appointment scheduling, billing integration, and analytics dashboard. Requires strong BA skills for requirements gathering and senior engineering for the backend API and cloud architecture.", 
                    EstimatedDuration = 16, 
                    PriorityLevel = PriorityLevel.High, 
                    EstimatedStartDate = now.AddDays(7), 
                    EstimatedEndDate = now.AddDays(7).AddMonths(16),
                    ProjectStatus = ProjectStatus.Pending, 
                    CreatedAt = now, 
                    UpdatedAt = now, 
                    CreatedBy = "MKT001", 
                    UpdatedBy = "MKT001" 
                }
            };
            _db.Projects.AddRange(projects);

            await _db.SaveChangesAsync();

            var users = new[]
            {
                new User { UserId = "HR123", UserName = "HR Manager", Email = "hr.manager@company.com", Password = "password123", DepartmentId = hrDept.DepartementID, EmployeeType = EmployeeType.Permanent, ExperienceYears = 10, ContractStart = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), ContractEnd = new DateTime(2030, 1, 1, 0, 0, 0, DateTimeKind.Utc), ContractStatus = ContractStatus.Active, CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" },
                new User { UserId = "GM001", UserName = "General Manager", Email = "gm@company.com", Password = "password123", DepartmentId = hrDept.DepartementID, EmployeeType = EmployeeType.Permanent, ExperienceYears = 15, ContractStart = new DateTime(2023, 1, 1, 0, 0, 0, DateTimeKind.Utc), ContractEnd = new DateTime(2030, 12, 31, 0, 0, 0, DateTimeKind.Utc), ContractStatus = ContractStatus.Active, CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" },
                new User { UserId = "MKT001", UserName = "Market Manager", Email = "mrkt@company.com", Password = "password123", DepartmentId = hrDept.DepartementID, EmployeeType = EmployeeType.Permanent, ExperienceYears = 15, ContractStart = new DateTime(2023, 1, 1, 0, 0, 0, DateTimeKind.Utc), ContractEnd = new DateTime(2030, 12, 31, 0, 0, 0, DateTimeKind.Utc), ContractStatus = ContractStatus.Active, CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" },

                new User { UserId = "EMP001", UserName = "Sarah Johnson", Email = "sarah.johnson@company.com", Password = "password123", DepartmentId = baDept.DepartementID, EmployeeType = EmployeeType.Permanent, ExperienceYears = 8, ContractStart = new DateTime(2025, 1, 15, 0, 0, 0, DateTimeKind.Utc), ContractEnd = new DateTime(2027, 1, 14, 0, 0, 0, DateTimeKind.Utc), ContractStatus = ContractStatus.Active, CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" },
                new User { UserId = "EMP002", UserName = "Michael Chen", Email = "michael.chen@company.com", Password = "password123", DepartmentId = baDept.DepartementID, EmployeeType = EmployeeType.ProfessionalServices, ExperienceYears = 3, ContractStart = new DateTime(2025, 3, 1, 0, 0, 0, DateTimeKind.Utc), ContractEnd = new DateTime(2026, 8, 31, 0, 0, 0, DateTimeKind.Utc), ContractStatus = ContractStatus.Active, CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" },
                new User { UserId = "EMP003", UserName = "Jessica Brown", Email = "jessica.brown@company.com", Password = "password123", DepartmentId = engDept.DepartementID, EmployeeType = EmployeeType.Permanent, ExperienceYears = 6, ContractStart = new DateTime(2024, 7, 1, 0, 0, 0, DateTimeKind.Utc), ContractEnd = new DateTime(2026, 6, 30, 0, 0, 0, DateTimeKind.Utc), ContractStatus = ContractStatus.Active, CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" },
                new User { UserId = "EMP004", UserName = "Alex Turner", Email = "alex.turner@company.com", Password = "password123", DepartmentId = engDept.DepartementID, EmployeeType = EmployeeType.Permanent, ExperienceYears = 9, ContractStart = new DateTime(2025, 2, 1, 0, 0, 0, DateTimeKind.Utc), ContractEnd = new DateTime(2027, 1, 31, 0, 0, 0, DateTimeKind.Utc), ContractStatus = ContractStatus.Active, CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" },
                new User { UserId = "EMP005", UserName = "Rachel Lee", Email = "rachel.lee@company.com", Password = "password123", DepartmentId = engDept.DepartementID, EmployeeType = EmployeeType.ProfessionalServices, ExperienceYears = 5, ContractStart = new DateTime(2024, 8, 1, 0, 0, 0, DateTimeKind.Utc), ContractEnd = new DateTime(2026, 5, 6, 0, 0, 0, DateTimeKind.Utc), ContractStatus = ContractStatus.ExpiringSoon, CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" },
                new User { UserId = "EMP006", UserName = "Linda Martinez", Email = "linda.martinez@company.com", Password = "password123", DepartmentId = engDept.DepartementID, EmployeeType = EmployeeType.ProfessionalServices, ExperienceYears = 2, ContractStart = new DateTime(2024, 10, 1, 0, 0, 0, DateTimeKind.Utc), ContractEnd = new DateTime(2026, 9, 30, 0, 0, 0, DateTimeKind.Utc), ContractStatus = ContractStatus.Active, CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" },
                new User { UserId = "EMP007", UserName = "David Kim", Email = "david.kim@company.com", Password = "password123", DepartmentId = baDept.DepartementID, EmployeeType = EmployeeType.Permanent, ExperienceYears = 7, ContractStart = new DateTime(2024, 9, 15, 0, 0, 0, DateTimeKind.Utc), ContractEnd = new DateTime(2026, 9, 14, 0, 0, 0, DateTimeKind.Utc), ContractStatus = ContractStatus.Active, CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" },
                new User { UserId = "PM001", UserName = "Project Manager", Email = "pm@company.com", Password = "password123", DepartmentId = engDept.DepartementID, EmployeeType = EmployeeType.Permanent, ExperienceYears = 10, ContractStart = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), ContractEnd = new DateTime(2027, 12, 31, 0, 0, 0, DateTimeKind.Utc), ContractStatus = ContractStatus.Active, CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" },

                // ── NEW EMPLOYEES for Smart Recommendation test ──
                new User { UserId = "EMP008", UserName = "Nina Patel", Email = "nina.patel@company.com", Password = "password123", DepartmentId = baDept.DepartementID, EmployeeType = EmployeeType.Permanent, ExperienceYears = 5, ContractStart = new DateTime(2025, 6, 1, 0, 0, 0, DateTimeKind.Utc), ContractEnd = new DateTime(2027, 5, 31, 0, 0, 0, DateTimeKind.Utc), ContractStatus = ContractStatus.Active, CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" },
                new User { UserId = "EMP009", UserName = "Omar Hassan", Email = "omar.hassan@company.com", Password = "password123", DepartmentId = engDept.DepartementID, EmployeeType = EmployeeType.Permanent, ExperienceYears = 7, ContractStart = new DateTime(2024, 11, 1, 0, 0, 0, DateTimeKind.Utc), ContractEnd = new DateTime(2026, 10, 31, 0, 0, 0, DateTimeKind.Utc), ContractStatus = ContractStatus.Active, CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" },
                new User { UserId = "EMP010", UserName = "Yuki Tanaka", Email = "yuki.tanaka@company.com", Password = "password123", DepartmentId = engDept.DepartementID, EmployeeType = EmployeeType.ProfessionalServices, ExperienceYears = 4, ContractStart = new DateTime(2025, 4, 1, 0, 0, 0, DateTimeKind.Utc), ContractEnd = new DateTime(2026, 12, 31, 0, 0, 0, DateTimeKind.Utc), ContractStatus = ContractStatus.Active, CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" },
                new User { UserId = "EMP999", UserName = "Dummy NoSkills", Email = "noskills@company.com", Password = "password123", DepartmentId = engDept.DepartementID, EmployeeType = EmployeeType.Permanent, ExperienceYears = 1, ContractStart = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), ContractEnd = new DateTime(2027, 1, 1, 0, 0, 0, DateTimeKind.Utc), ContractStatus = ContractStatus.Active, CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" },
                new User { UserId = "EMP888", UserName = "Dummy NoSkills2", Email = "noskills2@company.com", Password = "password123", DepartmentId = engDept.DepartementID, EmployeeType = EmployeeType.Permanent, ExperienceYears = 1, ContractStart = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), ContractEnd = new DateTime(2027, 1, 1, 0, 0, 0, DateTimeKind.Utc), ContractStatus = ContractStatus.Active, CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" },
                new User { UserId = "EMP011", UserName = "Dummy Test", Email = "noskills3@company.com", Password = "password123", DepartmentId = engDept.DepartementID, EmployeeType = EmployeeType.Permanent, ExperienceYears = 1, ContractStart = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), ContractEnd = new DateTime(2027, 1, 1, 0, 0, 0, DateTimeKind.Utc), ContractStatus = ContractStatus.Active, CreatedAt = now, UpdatedAt = now, CreatedBy = "system", UpdatedBy = "system" }
            };
            _db.Users.AddRange(users);
            await _db.SaveChangesAsync();

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
                new UserRole { UserId = "EMP003", RoleId = roleStaff.RoleId },
                new UserRole { UserId = "EMP004", RoleId = roleStaff.RoleId },
                new UserRole { UserId = "EMP005", RoleId = roleStaff.RoleId },
                new UserRole { UserId = "EMP006", RoleId = roleStaff.RoleId },
                new UserRole { UserId = "EMP007", RoleId = roleStaff.RoleId },
                new UserRole { UserId = "EMP008", RoleId = roleStaff.RoleId },
                new UserRole { UserId = "EMP009", RoleId = roleStaff.RoleId },
                new UserRole { UserId = "EMP010", RoleId = roleStaff.RoleId },
                new UserRole { UserId = "EMP999", RoleId = roleStaff.RoleId },
                new UserRole { UserId = "EMP888", RoleId = roleStaff.RoleId },
                new UserRole { UserId = "EMP011", RoleId = roleStaff.RoleId }
            );

            // Staff roles (display)
            _db.UserStaffRoles.AddRange(
                new UserStaffRole { UserId = "EMP001", StaffRoleId = srSeniorBA.StaffRoleId },
                new UserStaffRole { UserId = "EMP002", StaffRoleId = srJuniorBA.StaffRoleId },
                new UserStaffRole { UserId = "EMP003", StaffRoleId = srSeniorDev.StaffRoleId },
                new UserStaffRole { UserId = "EMP004", StaffRoleId = srArchitect.StaffRoleId },
                new UserStaffRole { UserId = "EMP005", StaffRoleId = srSeniorDev.StaffRoleId },
                new UserStaffRole { UserId = "EMP006", StaffRoleId = srJuniorDev.StaffRoleId },
                new UserStaffRole { UserId = "EMP007", StaffRoleId = srSeniorBA.StaffRoleId },
                // New employees
                new UserStaffRole { UserId = "EMP008", StaffRoleId = srJuniorBA.StaffRoleId },      // Nina: Junior BA (available, no project yet)
                new UserStaffRole { UserId = "EMP009", StaffRoleId = srSeniorDev.StaffRoleId },    // Omar: Senior Dev (available)
                new UserStaffRole { UserId = "EMP010", StaffRoleId = srPm.StaffRoleId },           // Yuki: PM (available)
                new UserStaffRole { UserId = "EMP999", StaffRoleId = srJuniorDev.StaffRoleId },    // Dummy: For NoSkills testing
                new UserStaffRole { UserId = "EMP888", StaffRoleId = srJuniorDev.StaffRoleId },    // Dummy: For NoSkills2 testing
                new UserStaffRole { UserId = "EMP011", StaffRoleId = srSeniorBA.StaffRoleId }     // Dummy: For NoSkills3 testing
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
            AddSkills("EMP003", "React", "Node.js", "TypeScript", "System Design");
            AddSkills("EMP004", "Solution Architecture", "Cloud Design", "Microservices", "System Integration");
            AddSkills("EMP005", "Python", "Django", "PostgreSQL", "API Design");
            AddSkills("EMP006", "JavaScript", "React", "CSS", "Git");
            AddSkills("EMP007", "Business Analysis", "Agile", "Scrum", "Product Management");
            // New employee skills
            AddSkills("EMP008", "Business Analysis", "Requirements Gathering", "Documentation", "Agile"); // Nina: Strong BA
            AddSkills("EMP009", "Python", "PostgreSQL", "API Design", "System Design", "React", "Node.js"); // Omar: Full-stack Senior Dev
            AddSkills("EMP010", "Testing", "Documentation", "JavaScript", "Git", "Agile"); // Yuki: QA + testing

            // Use AddRange for skill batch insert
            _db.UserSkills.AddRange(allUserSkills);

            // Project assignments — collect all items then AddRange for batch efficiency
            var allUserProjects = new List<UserProject>();
            void AddProject(string userId, string projectName, string roleInProject, UserProjectStatus status)
            {
                allUserProjects.Add(new UserProject
                {
                    UserId = userId,
                    ProjectId = byProject[projectName],
                    RoleInProject = roleInProject,
                    Status = status
                });
            }

            AddProject("EMP001", "Digital Transformation Initiative", "Senior BA", UserProjectStatus.Completed);
            AddProject("EMP002", "Digital Transformation Initiative", "Junior BA", UserProjectStatus.Completed);
            AddProject("EMP002", "Customer Portal Development", "Junior BA", UserProjectStatus.Assigned);
            AddProject("EMP003", "E-commerce Platform Rebuild", "Senior Dev", UserProjectStatus.Assigned);
            AddProject("EMP004", "Cloud Migration Project", "Architect", UserProjectStatus.Assigned);
            AddProject("EMP005", "Analytics Dashboard", "Senior Dev", UserProjectStatus.Completed);
            AddProject("EMP006", "Internal Tools Dashboard", "Junior Dev", UserProjectStatus.Assigned);
            AddProject("EMP007", "Mobile App Launch", "Senior BA", UserProjectStatus.Assigned);

            AddProject("PM001", "Customer Portal Development", "PM", UserProjectStatus.Assigned);
            AddProject("PM001", "E-commerce Platform Rebuild", "PM", UserProjectStatus.Assigned);
            AddProject("PM001", "Cloud Migration Project", "PM", UserProjectStatus.Assigned);
            AddProject("PM001", "Digital Transformation Initiative", "PM", UserProjectStatus.Assigned);

            // Use AddRange for project batch insert
            _db.UserProjects.AddRange(allUserProjects);

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

            // ── ProjectRequiredRoles for Healthcare Management System ──
            // This is what the Smart Recommendation Panel uses to generate team suggestions
            var hmsProject = projects.First(p => p.ProjectName == "Healthcare Management System");
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
                // ── Healthcare Management System ──
                new ProjectRequiredRole { ProjectID = hmsProject.ProjectID, StaffRoleId = staffRoleMap["Senior BA"],       RequiredCount = 1, WorkingType = WorkingType.Dedicated },
                new ProjectRequiredRole { ProjectID = hmsProject.ProjectID, StaffRoleId = staffRoleMap["Junior BA"],       RequiredCount = 1, WorkingType = WorkingType.Dedicated },
                new ProjectRequiredRole { ProjectID = hmsProject.ProjectID, StaffRoleId = staffRoleMap["Senior Dev"],      RequiredCount = 2, WorkingType = WorkingType.Dedicated },
                new ProjectRequiredRole { ProjectID = hmsProject.ProjectID, StaffRoleId = staffRoleMap["Junior Dev"],      RequiredCount = 2, WorkingType = WorkingType.Dedicated },
                new ProjectRequiredRole { ProjectID = hmsProject.ProjectID, StaffRoleId = staffRoleMap["Architect"],       RequiredCount = 1, WorkingType = WorkingType.NonDedicated },
                new ProjectRequiredRole { ProjectID = hmsProject.ProjectID, StaffRoleId = staffRoleMap["PM"], RequiredCount = 1, WorkingType = WorkingType.NonDedicated },

                // ── Digital Transformation Initiative ──
                new ProjectRequiredRole { ProjectID = byProject["Digital Transformation Initiative"], StaffRoleId = staffRoleMap["Senior BA"],       RequiredCount = 1, WorkingType = WorkingType.Dedicated },
                new ProjectRequiredRole { ProjectID = byProject["Digital Transformation Initiative"], StaffRoleId = staffRoleMap["Junior BA"],       RequiredCount = 1, WorkingType = WorkingType.Dedicated },
                new ProjectRequiredRole { ProjectID = byProject["Digital Transformation Initiative"], StaffRoleId = staffRoleMap["Senior Dev"],      RequiredCount = 2, WorkingType = WorkingType.Dedicated },
                new ProjectRequiredRole { ProjectID = byProject["Digital Transformation Initiative"], StaffRoleId = staffRoleMap["PM"], RequiredCount = 1, WorkingType = WorkingType.NonDedicated },

                // ── Customer Portal Development ──
                new ProjectRequiredRole { ProjectID = byProject["Customer Portal Development"], StaffRoleId = staffRoleMap["Senior BA"],       RequiredCount = 1, WorkingType = WorkingType.Dedicated },
                new ProjectRequiredRole { ProjectID = byProject["Customer Portal Development"], StaffRoleId = staffRoleMap["Junior BA"],       RequiredCount = 1, WorkingType = WorkingType.Dedicated },
                new ProjectRequiredRole { ProjectID = byProject["Customer Portal Development"], StaffRoleId = staffRoleMap["Senior Dev"],      RequiredCount = 1, WorkingType = WorkingType.Dedicated },
                new ProjectRequiredRole { ProjectID = byProject["Customer Portal Development"], StaffRoleId = staffRoleMap["Junior Dev"],      RequiredCount = 2, WorkingType = WorkingType.Dedicated },
                new ProjectRequiredRole { ProjectID = byProject["Customer Portal Development"], StaffRoleId = staffRoleMap["PM"], RequiredCount = 1, WorkingType = WorkingType.NonDedicated },

                // ── E-commerce Platform Rebuild ──
                new ProjectRequiredRole { ProjectID = byProject["E-commerce Platform Rebuild"], StaffRoleId = staffRoleMap["Senior Dev"],      RequiredCount = 2, WorkingType = WorkingType.Dedicated },
                new ProjectRequiredRole { ProjectID = byProject["E-commerce Platform Rebuild"], StaffRoleId = staffRoleMap["Junior Dev"],      RequiredCount = 3, WorkingType = WorkingType.Dedicated },
                new ProjectRequiredRole { ProjectID = byProject["E-commerce Platform Rebuild"], StaffRoleId = staffRoleMap["Senior BA"],       RequiredCount = 1, WorkingType = WorkingType.NonDedicated },
                new ProjectRequiredRole { ProjectID = byProject["E-commerce Platform Rebuild"], StaffRoleId = staffRoleMap["Architect"],       RequiredCount = 1, WorkingType = WorkingType.NonDedicated },
                new ProjectRequiredRole { ProjectID = byProject["E-commerce Platform Rebuild"], StaffRoleId = staffRoleMap["PM"], RequiredCount = 1, WorkingType = WorkingType.NonDedicated },

                // ── Cloud Migration Project ──
                new ProjectRequiredRole { ProjectID = byProject["Cloud Migration Project"], StaffRoleId = staffRoleMap["Architect"],       RequiredCount = 1, WorkingType = WorkingType.Dedicated },
                new ProjectRequiredRole { ProjectID = byProject["Cloud Migration Project"], StaffRoleId = staffRoleMap["Senior Dev"],      RequiredCount = 2, WorkingType = WorkingType.Dedicated },
                new ProjectRequiredRole { ProjectID = byProject["Cloud Migration Project"], StaffRoleId = staffRoleMap["Junior Dev"],      RequiredCount = 2, WorkingType = WorkingType.Dedicated },
                new ProjectRequiredRole { ProjectID = byProject["Cloud Migration Project"], StaffRoleId = staffRoleMap["PM"], RequiredCount = 1, WorkingType = WorkingType.NonDedicated },

                // ── Analytics Dashboard ──
                new ProjectRequiredRole { ProjectID = byProject["Analytics Dashboard"], StaffRoleId = staffRoleMap["Senior Dev"],      RequiredCount = 1, WorkingType = WorkingType.Dedicated },
                new ProjectRequiredRole { ProjectID = byProject["Analytics Dashboard"], StaffRoleId = staffRoleMap["Junior Dev"],      RequiredCount = 2, WorkingType = WorkingType.Dedicated },
                new ProjectRequiredRole { ProjectID = byProject["Analytics Dashboard"], StaffRoleId = staffRoleMap["Senior BA"],       RequiredCount = 1, WorkingType = WorkingType.NonDedicated },
                new ProjectRequiredRole { ProjectID = byProject["Analytics Dashboard"], StaffRoleId = staffRoleMap["PM"], RequiredCount = 1, WorkingType = WorkingType.NonDedicated },

                // ── Internal Tools Dashboard ──
                new ProjectRequiredRole { ProjectID = byProject["Internal Tools Dashboard"], StaffRoleId = staffRoleMap["Junior Dev"],      RequiredCount = 2, WorkingType = WorkingType.Dedicated },
                new ProjectRequiredRole { ProjectID = byProject["Internal Tools Dashboard"], StaffRoleId = staffRoleMap["Senior Dev"],      RequiredCount = 1, WorkingType = WorkingType.Dedicated },
                new ProjectRequiredRole { ProjectID = byProject["Internal Tools Dashboard"], StaffRoleId = staffRoleMap["PM"], RequiredCount = 1, WorkingType = WorkingType.NonDedicated },

                // ── Mobile App Launch ──
                new ProjectRequiredRole { ProjectID = byProject["Mobile App Launch"], StaffRoleId = staffRoleMap["Senior Dev"],      RequiredCount = 2, WorkingType = WorkingType.Dedicated },
                new ProjectRequiredRole { ProjectID = byProject["Mobile App Launch"], StaffRoleId = staffRoleMap["Junior Dev"],      RequiredCount = 2, WorkingType = WorkingType.Dedicated },
                new ProjectRequiredRole { ProjectID = byProject["Mobile App Launch"], StaffRoleId = staffRoleMap["Senior BA"],       RequiredCount = 1, WorkingType = WorkingType.Dedicated },
                new ProjectRequiredRole { ProjectID = byProject["Mobile App Launch"], StaffRoleId = staffRoleMap["PM"], RequiredCount = 1, WorkingType = WorkingType.NonDedicated }
            );

            // ── Project-level Required Skills ──
            // These are the skills needed for this project (separate from roles)
            // The Smart Recommendation Panel uses these to match employees
            // Use AddRange for project required skills batch insert
            var projectSkillNames = new[] { "Python", "React", "PostgreSQL", "API Design", "System Design", "Business Analysis", "Testing", "Documentation" };
            var projectRequiredSkills = projectSkillNames
                .Where(skillName => byName.ContainsKey(skillName))
                .Select(skillName => new ProjectRequiredSkill { ProjectId = hmsProject.ProjectID, SkillId = byName[skillName] })
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
