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
    public async Task<List<HolidayDto>> GetAllAsync(int? clientId = null)
    {
        IQueryable<Holiday> query = _db.Holidays.Include(h => h.Client).AsNoTracking();

        if (clientId.HasValue)
        {
            query = query.Where(h => h.ClientId == null || h.ClientId == clientId.Value);
        }

        var holidays = await query.OrderBy(h => h.DateStart).ToListAsync();

        return holidays.Select(h => new HolidayDto
        {
            Id = h.Id,
            Name = h.Name,
            DateStart = h.DateStart,
            DateEnd = h.DateEnd,
            ClientId = h.ClientId,
            ClientName = h.Client != null ? h.Client.Name : "National"
        }).ToList();
    }

    /// <summary>
    /// Creates a new holiday entry for a date range.
    /// </summary>
    public async Task<(bool Success, string? Error, List<HolidayDto>? Data)> CreateAsync(CreateHolidayRequest request)
    {
        var startDate = request.StartDate.Date;
        var endDate = request.EndDate.Date;

        if (startDate > endDate)
        {
            return (false, "Start date must be less than or equal to End date.", null);
        }

        if (request.ClientId.HasValue)
        {
            var clientExists = await _db.Clients.AnyAsync(c => c.Id == request.ClientId.Value);
            if (!clientExists)
            {
                return (false, "Assigned client does not exist.", null);
            }
        }

        var holiday = new Holiday
        {
            Name = request.Name.Trim(),
            DateStart = DateTime.SpecifyKind(startDate, DateTimeKind.Utc),
            DateEnd = DateTime.SpecifyKind(endDate, DateTimeKind.Utc),
            ClientId = request.ClientId
        };

        _db.Holidays.Add(holiday);

        if (holiday.ClientId.HasValue)
        {
            var client = await _db.Clients.FindAsync(holiday.ClientId.Value);
            if (client != null)
            {
                client.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _db.SaveChangesAsync();

        string? clientName = "National";
        if (holiday.ClientId.HasValue)
        {
            var c = await _db.Clients.FindAsync(holiday.ClientId.Value);
            clientName = c?.Name;
        }

        var result = new List<HolidayDto>
        {
            new HolidayDto
            {
                Id = holiday.Id,
                Name = holiday.Name,
                DateStart = holiday.DateStart,
                DateEnd = holiday.DateEnd,
                ClientId = holiday.ClientId,
                ClientName = clientName
            }
        };

        return (true, null, result);
    }

    public async Task<(bool Success, string? Error, HolidayDto? Data)> UpdateAsync(int id, UpdateHolidayRequest request)
    {
        var holiday = await _db.Holidays.Include(h => h.Client).FirstOrDefaultAsync(h => h.Id == id);
        if (holiday == null)
        {
            return (false, "Holiday not found.", null);
        }

        var startDate = request.DateStart.Date;
        var endDate = request.DateEnd.Date;

        if (startDate > endDate)
        {
            return (false, "Start date must be less than or equal to End date.", null);
        }

        if (request.ClientId.HasValue)
        {
            var clientExists = await _db.Clients.AnyAsync(c => c.Id == request.ClientId.Value);
            if (!clientExists)
            {
                return (false, "Assigned client does not exist.", null);
            }
        }

        var oldClientId = holiday.ClientId;
        var newClientId = request.ClientId;

        holiday.Name = request.Name.Trim();
        holiday.DateStart = DateTime.SpecifyKind(startDate, DateTimeKind.Utc);
        holiday.DateEnd = DateTime.SpecifyKind(endDate, DateTimeKind.Utc);
        holiday.ClientId = request.ClientId;

        if (oldClientId.HasValue)
        {
            var c = await _db.Clients.FindAsync(oldClientId.Value);
            if (c != null) c.UpdatedAt = DateTime.UtcNow;
        }
        if (newClientId.HasValue && newClientId != oldClientId)
        {
            var c = await _db.Clients.FindAsync(newClientId.Value);
            if (c != null) c.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        var updatedHoliday = await _db.Holidays.Include(h => h.Client).FirstOrDefaultAsync(h => h.Id == id);

        return (true, null, new HolidayDto
        {
            Id = updatedHoliday!.Id,
            Name = updatedHoliday.Name,
            DateStart = updatedHoliday.DateStart,
            DateEnd = updatedHoliday.DateEnd,
            ClientId = updatedHoliday.ClientId,
            ClientName = updatedHoliday.Client != null ? updatedHoliday.Client.Name : "National"
        });
    }

    public async Task<(bool Success, string? Error)> DeleteAsync(int id)
    {
        var holiday = await _db.Holidays.FindAsync(id);
        if (holiday == null)
        {
            return (false, "Holiday not found.");
        }

        var clientId = holiday.ClientId;

        _db.Holidays.Remove(holiday);

        if (clientId.HasValue)
        {
            var c = await _db.Clients.FindAsync(clientId.Value);
            if (c != null) c.UpdatedAt = DateTime.UtcNow;
        }

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

        foreach (var item in request.Holidays)
        {
            if (item.DateStart.Date > item.DateEnd.Date)
            {
                return (false, $"For holiday '{item.Name}', Start date must be less than or equal to End date.", null);
            }
            if (item.ClientId.HasValue)
            {
                var clientExists = await _db.Clients.AnyAsync(c => c.Id == item.ClientId.Value);
                if (!clientExists)
                {
                    return (false, $"Client ID {item.ClientId} for holiday '{item.Name}' does not exist.", null);
                }
            }
        }

        var createdHolidays = request.Holidays.Select(item => new Holiday
        {
            Name = item.Name.Trim(),
            DateStart = DateTime.SpecifyKind(item.DateStart.Date, DateTimeKind.Utc),
            DateEnd = DateTime.SpecifyKind(item.DateEnd.Date, DateTimeKind.Utc),
            ClientId = item.ClientId
        }).ToList();

        _db.Holidays.AddRange(createdHolidays);

        var clientIdsToUpdate = createdHolidays.Where(h => h.ClientId.HasValue).Select(h => h.ClientId!.Value).Distinct();
        foreach (var cId in clientIdsToUpdate)
        {
            var c = await _db.Clients.FindAsync(cId);
            if (c != null) c.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        var ids = createdHolidays.Select(h => h.Id).ToList();
        var savedHolidays = await _db.Holidays.Include(h => h.Client).Where(h => ids.Contains(h.Id)).ToListAsync();

        var result = savedHolidays.Select(h => new HolidayDto
        {
            Id = h.Id,
            Name = h.Name,
            DateStart = h.DateStart,
            DateEnd = h.DateEnd,
            ClientId = h.ClientId,
            ClientName = h.Client != null ? h.Client.Name : "National"
        }).ToList();

        return (true, null, result);
    }
}
