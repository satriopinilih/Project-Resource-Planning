using Contracts.DTOs.ProjectPhase;
using Entities;
using Entities.Entities;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

/// <summary>
/// Standard CRUD service for ProjectPhase master data.
/// Accessible by GM/Admin via the Master Data menu.
/// </summary>
public class ProjectPhaseService
{
    private readonly ApplicationDbContext _db;

    public ProjectPhaseService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<List<ProjectPhaseDto>> GetAllAsync()
    {
        return await _db.ProjectPhases
            .OrderBy(pp => pp.Id)
            .Select(pp => new ProjectPhaseDto
            {
                Id = pp.Id,
                Name = pp.Name
            })
            .ToListAsync();
    }

    public async Task<(bool Success, string? Error, ProjectPhaseDto? Data)> CreateAsync(CreateProjectPhaseRequest request)
    {
        var trimmed = request.Name.Trim();

        var exists = await _db.ProjectPhases
            .AnyAsync(pp => pp.Name.ToLower() == trimmed.ToLower());

        if (exists)
            return (false, $"Phase '{trimmed}' already exists.", null);

        var phase = new ProjectPhase
        {
            Name = trimmed,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.ProjectPhases.Add(phase);
        await _db.SaveChangesAsync();

        return (true, null, new ProjectPhaseDto { Id = phase.Id, Name = phase.Name });
    }

    public async Task<(bool Success, string? Error, ProjectPhaseDto? Data)> UpdateAsync(int id, UpdateProjectPhaseRequest request)
    {
        var phase = await _db.ProjectPhases.FindAsync(id);
        if (phase is null)
            return (false, "Project phase not found.", null);

        var trimmed = request.Name.Trim();

        var duplicate = await _db.ProjectPhases
            .AnyAsync(pp => pp.Id != id && pp.Name.ToLower() == trimmed.ToLower());

        if (duplicate)
            return (false, $"Phase '{trimmed}' already exists.", null);

        phase.Name = trimmed;
        phase.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return (true, null, new ProjectPhaseDto { Id = phase.Id, Name = phase.Name });
    }

    public async Task<(bool Success, string? Error)> DeleteAsync(int id)
    {
        var phase = await _db.ProjectPhases
            .Include(pp => pp.ActivityLogs)
            .FirstOrDefaultAsync(pp => pp.Id == id);

        if (phase is null)
            return (false, "Project phase not found.");

        if (phase.ActivityLogs.Count > 0)
            return (false, $"Cannot delete '{phase.Name}' — it is referenced by {phase.ActivityLogs.Count} activity log(s).");

        _db.ProjectPhases.Remove(phase);
        await _db.SaveChangesAsync();

        return (true, null);
    }
}
