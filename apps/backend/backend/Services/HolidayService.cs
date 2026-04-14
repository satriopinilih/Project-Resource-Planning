using Contracts.DTOs.Holiday;
using Entities;
using Entities.Entities;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public class HolidayService
{
    private readonly ApplicationDbContext _db;

    public HolidayService(ApplicationDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Retrieves all holidays ordered by date.
    /// Uses AsNoTracking since this is a read-only display query.
    /// </summary>
    public async Task<List<HolidayDto>> GetAllAsync()
    {
        var holidays = await _db.Holidays
            .AsNoTracking()
            .OrderBy(h => h.Date)
            .ToListAsync();

        return holidays.Select(h => new HolidayDto
        {
            Id = h.Id,
            Name = h.Name,
            Date = h.Date
        }).ToList();
    }

    /// <summary>
    /// Creates a new holiday entry.
    /// </summary>
    public async Task<(bool Success, string? Error, HolidayDto? Data)> CreateAsync(CreateHolidayRequest request)
    {
        var holiday = new Holiday
        {
            Name = request.Name,
            Date = request.Date
        };

        _db.Holidays.Add(holiday);
        await _db.SaveChangesAsync();

        return (true, null, new HolidayDto
        {
            Id = holiday.Id,
            Name = holiday.Name,
            Date = holiday.Date
        });
    }
}
