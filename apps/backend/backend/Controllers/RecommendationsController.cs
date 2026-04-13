using Commons.Enums;
using Contracts.DTOs.Common;
using Contracts.DTOs.Project;
using Entities;
using Entities.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RecommendationsController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public RecommendationsController(ApplicationDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// GET /api/recommendations/{projectId}
    /// Returns smart team recommendations for a project based on required roles,
    /// staff skills, experience, and current availability.
    /// </summary>
    [HttpGet("{projectId}")]
    public async Task<ActionResult<ApiResponse<RecommendationResponse>>> GetRecommendations(int projectId)
    {
        // ── 1. Load the project with its required roles AND project-level skills ──
        var project = await _db.Projects
            .Include(p => p.ProjectRequiredRoles)
                .ThenInclude(pr => pr.StaffRole)
            .Include(p => p.ProjectRequiredSkills)
                .ThenInclude(ps => ps.Skill)
            .FirstOrDefaultAsync(p => p.ProjectID == projectId);

        if (project is null)
            return NotFound(ApiResponse<RecommendationResponse>.ErrorResponse("Project not found"));

        // ── 2. Load all staff users with their skills, roles, and current assignments ──
        var staffUsers = await _db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.UserStaffRoles).ThenInclude(usr => usr.StaffRole)
            .Include(u => u.UserSkills).ThenInclude(us => us.Skill)
            .Include(u => u.UserProjects).ThenInclude(up => up.Project)
            .Where(u => u.UserRoles.Any(ur => ur.Role.RoleName == RoleName.Staff))
            .ToListAsync();

        // ── 3. Build required roles list ──
        var requiredRoles = project.ProjectRequiredRoles.Select(pr => new RequiredRoleDto
        {
            StaffRoleId = pr.StaffRoleId,
            RoleName = pr.StaffRole.RoleName,
            RequiredCount = pr.RequiredCount,
            WorkingType = pr.WorkingType.ToString()
        }).ToList();

        // ── 3b. Get project-level required skills ──
        var projectSkills = project.ProjectRequiredSkills
            .Select(ps => ps.Skill.SkillName)
            .Distinct()
            .ToList();

        // ── 4. Score and rank every staff member for every required role ──
        var allCandidates = new List<(CandidateDto candidate, string targetRole, double score)>();

        foreach (var req in requiredRoles)
        {
            foreach (var user in staffUsers)
            {
                var candidate = ScoreCandidate(user, req, project, projectSkills);
                allCandidates.Add((candidate, req.RoleName, candidate.SkillMatchPercent));
            }
        }

        // ── 5. Generate Option A: Best skill match (original timeline) ──
        var optionA = BuildOption(
            title: "Option A: Best Skill Match",
            allCandidates,
            requiredRoles,
            project.EstimatedStartDate,
            project.EstimatedEndDate,
            prioritizeAvailability: false
        );

        // ── 6. Generate Option B: Best availability (optimized, no hiring) ──
        var optionB = BuildOption(
            title: "Option B: Optimized Availability",
            allCandidates,
            requiredRoles,
            project.EstimatedStartDate,
            project.EstimatedEndDate,
            prioritizeAvailability: true
        );

        // ── 7. Determine the best option ──
        string bestOption;
        string bestReason;

        if (!optionA.RequiresHiring && !optionB.RequiresHiring)
        {
            if (optionA.MatchScore >= optionB.MatchScore)
            {
                bestOption = "A";
                bestReason = $"Both options have full team availability. Option A has a higher skill match score ({optionA.MatchScore:F0}% vs {optionB.MatchScore:F0}%).";
            }
            else
            {
                bestOption = "B";
                bestReason = $"Both options have full team availability. Option B has a higher skill match score ({optionB.MatchScore:F0}% vs {optionA.MatchScore:F0}%).";
            }
        }
        else if (!optionB.RequiresHiring)
        {
            bestOption = "B";
            bestReason = "No hiring required. All resources are available within the requested period.";
        }
        else if (!optionA.RequiresHiring)
        {
            bestOption = "A";
            bestReason = "No hiring required. Best skill match with full availability.";
        }
        else
        {
            bestOption = optionA.MatchScore >= optionB.MatchScore ? "A" : "B";
            bestReason = "Both options require hiring. Consider expanding the team pool.";
        }

        var response = new RecommendationResponse
        {
            ProjectId = project.ProjectID,
            ProjectName = project.ProjectName,
            EstimatedStartDate = project.EstimatedStartDate,
            EstimatedEndDate = project.EstimatedEndDate,
            RequiredRoles = requiredRoles,
            RequiredSkills = projectSkills,
            OptionA = optionA,
            OptionB = optionB,
            BestOption = bestOption,
            BestOptionReason = bestReason
        };

        return Ok(ApiResponse<RecommendationResponse>.SuccessResponse(response));
    }

    // ════════════════════════════════════════════════════════
    //  SCORING LOGIC
    // ════════════════════════════════════════════════════════

    private CandidateDto ScoreCandidate(User user, RequiredRoleDto requiredRole, Project project, List<string> projectSkills)
    {
        // 1. Check if user has the matching staff role
        var userStaffRoles = user.UserStaffRoles.Select(usr => usr.StaffRole.RoleName).ToList();
        bool hasMatchingRole = userStaffRoles.Any(r => r == requiredRole.RoleName);

        // Fallback: Senior can act as Junior
        if (!hasMatchingRole && requiredRole.RoleName.StartsWith("Junior ", StringComparison.OrdinalIgnoreCase))
        {
            string seniorEquivalent = "Senior " + requiredRole.RoleName.Substring(7);
            if (userStaffRoles.Any(r => string.Equals(r, seniorEquivalent, StringComparison.OrdinalIgnoreCase)))
            {
                hasMatchingRole = true;
            }
        }

        // 2. Get user skills
        var userSkills = user.UserSkills.Select(us => us.Skill.SkillName).ToList();

        // 3. Determine relevant skills for scoring
        // Use project-level skills if defined, otherwise fall back to hardcoded role map
        var skillsToMatch = projectSkills.Count > 0
            ? projectSkills
            : GetSkillsForRole(requiredRole.RoleName);
        var matchedSkills = userSkills.Intersect(skillsToMatch, StringComparer.OrdinalIgnoreCase).ToList();

        // 4. Calculate skill match percentage
        double skillMatchPercent = skillsToMatch.Count > 0
            ? (double)matchedSkills.Count / skillsToMatch.Count * 100
            : (hasMatchingRole ? 75 : 0); // If no skill map, use role match as fallback

        // Bonus for having the exact staff role
        if (hasMatchingRole)
        {
            // Give a massive score boost to ensure people with the right role are prioritized
            skillMatchPercent = Math.Min(100, skillMatchPercent + 50);
        }
        else
        {
            // Disqualify candidates who do not have the exact role mapping
            // to completely prevent cross-role displacement.
            skillMatchPercent = 0; 
        }

        // 5. Check availability based on WorkingType
        var activeProjects = user.UserProjects
            .Where(up => up.Status == UserProjectStatus.Assigned && up.Project != null)
            .ToList();

        bool isAvailable = true;
        string availabilityNote = "Available now";
        var currentProjectNames = new List<string>();

        // If the role is NonDedicated, they can multitask, so they are considered available
        bool isDedicatedOnly = string.Equals(requiredRole.WorkingType, "Dedicated", StringComparison.OrdinalIgnoreCase);

        // Track the latest end date among all overlapping projects
        DateTime? latestOverlapEnd = null;

        foreach (var up in activeProjects)
        {
            var pStart = up.StartDate ?? up.Project.EstimatedStartDate;
            var pEnd = up.EndDate ?? up.Project.EstimatedEndDate;

            // Check overlap with the target project timeline
            if (pStart < project.EstimatedEndDate && pEnd > project.EstimatedStartDate)
            {
                currentProjectNames.Add(up.Project.ProjectName);

                if (isDedicatedOnly)
                {
                    isAvailable = false;
                    if (latestOverlapEnd == null || pEnd > latestOverlapEnd)
                    {
                        latestOverlapEnd = pEnd;
                    }
                }
            }
        }

        if (isAvailable)
        {
            if (activeProjects.Count == 0)
                availabilityNote = "Fully available — no current assignments";
            else if (!isDedicatedOnly && currentProjectNames.Count > 0)
                availabilityNote = "Available concurrently (Non-Dedicated)";
        }
        else if (latestOverlapEnd.HasValue)
        {
            availabilityNote = $"Available from {latestOverlapEnd.Value:MMM dd, yyyy}";
        }

        // 6. Get experience years
        int experienceYears = user.ExperienceYears;

        return new CandidateDto
        {
            UserId = user.UserId,
            UserName = user.UserName,
            StaffRole = userStaffRoles.FirstOrDefault() ?? "Staff",
            TargetRole = requiredRole.RoleName,
            ExperienceYears = experienceYears,
            Skills = userSkills,
            MatchedSkills = matchedSkills,
            SkillMatchPercent = Math.Round(skillMatchPercent, 1),
            IsAvailable = isAvailable,
            AvailabilityNote = availabilityNote,
            CurrentProjects = currentProjectNames
        };
    }

    private RecommendationOption BuildOption(
        string title,
        List<(CandidateDto candidate, string targetRole, double score)> allCandidates,
        List<RequiredRoleDto> requiredRoles,
        DateTime projectStart,
        DateTime projectEnd,
        bool prioritizeAvailability)
    {
        var selectedCandidates = new List<CandidateDto>();
        var usedUserIds = new HashSet<string>();
        bool requiresHiring = false;
        var hiringDetails = new List<string>();
        int totalAvailableNow = 0;

        foreach (var req in requiredRoles)
        {
            // Get candidates for this role, sorted by preference
            var roleCandidates = allCandidates
                .Where(c => c.targetRole == req.RoleName && !usedUserIds.Contains(c.candidate.UserId))
                .Select(c => c.candidate)
                .ToList();

            if (prioritizeAvailability)
            {
                // Option B: Prioritize available people, then by skill match
                roleCandidates = roleCandidates
                    .OrderByDescending(c => c.IsAvailable)
                    .ThenByDescending(c => c.SkillMatchPercent)
                    .ThenByDescending(c => c.ExperienceYears)
                    .ToList();
            }
            else
            {
                // Option A: Prioritize skill match, then availability
                roleCandidates = roleCandidates
                    .OrderByDescending(c => c.SkillMatchPercent)
                    .ThenByDescending(c => c.ExperienceYears)
                    .ThenByDescending(c => c.IsAvailable)
                    .ToList();
            }

            int needed = req.RequiredCount;
            int filled = 0;

            foreach (var candidate in roleCandidates)
            {
                if (filled >= needed) break;

                // Only include candidates with at least some relevance (> 0% match)
                if (candidate.SkillMatchPercent > 0 || candidate.StaffRole == req.RoleName)
                {
                    selectedCandidates.Add(candidate);
                    usedUserIds.Add(candidate.UserId);
                    filled++;

                    if (candidate.IsAvailable) totalAvailableNow++;
                }
            }

            // If we couldn't fill all slots
            if (filled < needed)
            {
                requiresHiring = true;
                hiringDetails.Add($"{needed - filled}x {req.RoleName} ({req.WorkingType})");
            }
        }

        // Calculate overall match score
        double avgMatchScore = selectedCandidates.Count > 0
            ? selectedCandidates.Average(c => c.SkillMatchPercent)
            : 0;

        // Ensure timelines stay as estimated
        DateTime optStart = projectStart;
        DateTime optEnd = projectEnd;

        bool requiresReschedule = false;
        var rescheduleDetails = new List<string>();

        // New logic: Do not shift dates. Instead, alert the user based on availability delays.
        var unavailableCandidates = selectedCandidates.Where(c => !c.IsAvailable).ToList();
        
        foreach(var c in unavailableCandidates)
        {
            var parts = c.AvailabilityNote.Replace("Available from ", "");
            if (DateTime.TryParse(parts, out var d))
            {
                var daysDelay = (d.Date - projectStart.Date).TotalDays;
                
                if (daysDelay > 7)
                {
                    requiresHiring = true;
                    hiringDetails.Add($"{c.TargetRole} is unavailable for {(int)daysDelay} days (needs new hire/replacement)");
                }
                else if (daysDelay > 0)
                {
                    requiresReschedule = true;
                    rescheduleDetails.Add($"{c.TargetRole} available in {(int)daysDelay} days (needs minor reschedule)");
                }
            }
        }

        return new RecommendationOption
        {
            Title = title,
            Timeline = $"{optStart:MMM dd, yyyy} — {optEnd:MMM dd, yyyy}",
            StartDate = optStart,
            EndDate = optEnd,
            TeamSize = selectedCandidates.Count,
            AvailableNow = totalAvailableNow,
            RequiresHiring = requiresHiring,
            HiringDetail = hiringDetails.Count > 0 ? string.Join(", ", hiringDetails) : "",
            RequiresReschedule = requiresReschedule,
            RescheduleDetail = rescheduleDetails.Count > 0 ? string.Join(", ", rescheduleDetails) : "",
            MatchScore = Math.Round(avgMatchScore, 1),
            Candidates = selectedCandidates
        };
    }

    /// <summary>
    /// Maps staff roles to relevant skills for matching purposes.
    /// This is the "intelligence" layer — determines which skills matter for which role.
    /// </summary>
    private static List<string> GetSkillsForRole(string roleName)
    {
        return roleName switch
        {
            "Senior BA" => new List<string> { "Business Analysis", "Requirements Gathering", "Stakeholder Management", "Documentation", "Agile", "Scrum" },
            "Junior BA" => new List<string> { "Business Analysis", "Documentation", "Testing", "Agile" },
            "Senior Dev" => new List<string> { "React", "Node.js", "TypeScript", "System Design", "Python", "PostgreSQL", "API Design" },
            "Junior Dev" => new List<string> { "JavaScript", "React", "CSS", "Git", "TypeScript" },
            "Architect" => new List<string> { "Solution Architecture", "Cloud Design", "Microservices", "System Integration", "System Design" },
            "Software Engineer" => new List<string> { "React", "Node.js", "TypeScript", "JavaScript", "Python", "Git", "API Design" },
            "QA Tester" => new List<string> { "Testing", "Documentation", "JavaScript", "Git", "Agile" },
            "Project Manager" => new List<string> { "Agile", "Scrum", "Stakeholder Management", "Product Management" },
            _ => new List<string>()
        };
    }
}
