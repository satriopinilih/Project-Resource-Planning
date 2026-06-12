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
    /// Creates a new holiday entry or entries for a date range.
    /// </summary>
    public async Task<(bool Success, string? Error, List<HolidayDto>? Data)> CreateAsync(CreateHolidayRequest request)
    {
        var startDate = request.StartDate.Date;
        var endDate = request.EndDate.Date;

        if (startDate > endDate)
        {
            return (false, "Start date must be less than or equal to End date.", null);
        }

        var dates = new List<DateTime>();
        for (var date = startDate; date <= endDate; date = date.AddDays(1))
        {
            dates.Add(date);
        }

        var createdHolidays = new List<Holiday>();
        bool isMultiDay = dates.Count > 1;

        for (int i = 0; i < dates.Count; i++)
        {
            var date = dates[i];
            var name = isMultiDay ? $"{request.Name.Trim()}{i + 1}" : request.Name.Trim();

            var holiday = new Holiday
            {
                Name = name,
                Date = DateTime.SpecifyKind(date, DateTimeKind.Utc)
            };

            _db.Holidays.Add(holiday);
            createdHolidays.Add(holiday);
        }

        await _db.SaveChangesAsync();

        var result = createdHolidays.Select(h => new HolidayDto
        {
            Id = h.Id,
            Name = h.Name,
            Date = h.Date
        }).ToList();

        return (true, null, result);
    }

    public async Task<(bool Success, string? Error, HolidayDto? Data)> UpdateAsync(int id, UpdateHolidayRequest request)
    {
        var holiday = await _db.Holidays.FindAsync(id);
        if (holiday == null)
        {
            return (false, "Holiday not found.", null);
        }

        holiday.Name = request.Name.Trim();
        holiday.Date = DateTime.SpecifyKind(request.Date, DateTimeKind.Utc);

        await _db.SaveChangesAsync();

        return (true, null, new HolidayDto
        {
            Id = holiday.Id,
            Name = holiday.Name,
            Date = holiday.Date
        });
    }

    public async Task<(bool Success, string? Error)> DeleteAsync(int id)
    {
        var holiday = await _db.Holidays.FindAsync(id);
        if (holiday == null)
        {
            return (false, "Holiday not found.");
        }

        _db.Holidays.Remove(holiday);
        await _db.SaveChangesAsync();

        return (true, null);
    }

    /// <summary>
    /// Creates multiple holidays in bulk.
    /// </summary>
    public async Task<(bool Success, string? Error, List<HolidayDto>? Data)> BulkCreateAsync(BulkCreateHolidaysRequest request)
    {
        if (request.Holidays == null || !request.Holidays.Any())
        {
            return (false, "No holiday records provided.", null);
        }

        var createdHolidays = new List<Holiday>();
        foreach (var item in request.Holidays)
        {
            var holiday = new Holiday
            {
                Name = item.Name.Trim(),
                Date = DateTime.SpecifyKind(item.Date.Date, DateTimeKind.Utc)
            };
            _db.Holidays.Add(holiday);
            createdHolidays.Add(holiday);
        }

        await _db.SaveChangesAsync();

        var result = createdHolidays.Select(h => new HolidayDto
        {
            Id = h.Id,
            Name = h.Name,
            Date = h.Date
        }).ToList();

        return (true, null, result);
    }
}
