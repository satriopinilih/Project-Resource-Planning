using Contracts.DTOs.Skill;
using Entities;
using Entities.Entities;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public class SkillService
{
    private readonly ApplicationDbContext _db;

    public SkillService(ApplicationDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Retrieves all skills ordered alphabetically by name.
    /// Uses AsNoTracking since this is a read-only query.
    /// </summary>
    public async Task<List<SkillDto>> GetAllAsync()
    {
        var skills = await _db.Skills
            .AsNoTracking()
            .OrderBy(s => s.SkillName)
            .ToListAsync();

        return skills.Select(s => new SkillDto
        {
            SkillID = s.SkillID,
            SkillName = s.SkillName
        }).ToList();
    }

    /// <summary>
    /// Creates a new skill in the database.
    /// Prevents duplicate skill names (case-insensitive).
    /// </summary>
    public async Task<(bool Success, string? Error, SkillDto? Data)> CreateAsync(CreateSkillRequest request)
    {
        var trimmedName = request.SkillName.Trim();
        var exists = await _db.Skills
            .AnyAsync(s => s.SkillName.ToLower() == trimmedName.ToLower());

        if (exists)
        {
            return (false, "A skill with this name already exists.", null);
        }

        var skill = new Skill
        {
            SkillName = trimmedName
        };

        _db.Skills.Add(skill);
        await _db.SaveChangesAsync();

        return (true, null, new SkillDto
        {
            SkillID = skill.SkillID,
            SkillName = skill.SkillName
        });
    }

    /// <summary>
    /// Updates the name of an existing skill.
    /// Prevents renaming to an existing skill name (case-insensitive).
    /// </summary>
    public async Task<(bool Success, string? Error, SkillDto? Data)> UpdateAsync(int id, UpdateSkillRequest request)
    {
        var skill = await _db.Skills.FindAsync(id);
        if (skill == null)
        {
            return (false, "Skill not found.", null);
        }

        var trimmedName = request.SkillName.Trim();
        var exists = await _db.Skills
            .AnyAsync(s => s.SkillID != id && s.SkillName.ToLower() == trimmedName.ToLower());

        if (exists)
        {
            return (false, "A skill with this name already exists.", null);
        }

        skill.SkillName = trimmedName;
        await _db.SaveChangesAsync();

        return (true, null, new SkillDto
        {
            SkillID = skill.SkillID,
            SkillName = skill.SkillName
        });
    }

    /// <summary>
    /// Deletes a skill from the database.
    /// Safely clears references in UserSkills or ProjectRequiredSkills first.
    /// </summary>
    public async Task<(bool Success, string? Error)> DeleteAsync(int id)
    {
        var skill = await _db.Skills.FindAsync(id);
        if (skill == null)
        {
            return (false, "Skill not found.");
        }

        // Clean up references in UserSkills
        var userSkills = await _db.UserSkills.Where(us => us.SkillId == id).ToListAsync();
        _db.UserSkills.RemoveRange(userSkills);

        // Clean up references in ProjectRequiredSkills
        var projectSkills = await _db.ProjectRequiredSkills.Where(ps => ps.SkillId == id).ToListAsync();
        _db.ProjectRequiredSkills.RemoveRange(projectSkills);

        _db.Skills.Remove(skill);
        await _db.SaveChangesAsync();

        return (true, null);
    }
}
