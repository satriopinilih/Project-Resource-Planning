using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Contracts.DTOs.Client;
using Entities;
using Entities.Entities;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public class ClientService
{
    private readonly ApplicationDbContext _db;

    public ClientService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<List<ClientDto>> GetAllAsync()
    {
        var today = DateTime.UtcNow.Date;

        var clients = await _db.Clients
            .Include(c => c.Holidays)
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .ToListAsync();

        var nationalHolidays = await _db.Holidays
            .Where(h => h.ClientId == null)
            .AsNoTracking()
            .ToListAsync();

        var result = new List<ClientDto>();

        foreach (var client in clients)
        {
            var applicableHolidays = client.Holidays.Concat(nationalHolidays).ToList();

            // Total holiday days
            int totalDays = applicableHolidays.Sum(h => (h.DateEnd.Date - h.DateStart.Date).Days + 1);

            // Longest holiday
            int longestDays = applicableHolidays.Any()
                ? applicableHolidays.Max(h => (h.DateEnd.Date - h.DateStart.Date).Days + 1)
                : 0;

            // Upcoming holiday
            var nextHoliday = applicableHolidays
                .Where(h => h.DateStart.Date >= today)
                .OrderBy(h => h.DateStart)
                .FirstOrDefault();

            string upcomingStr = nextHoliday != null
                ? nextHoliday.DateStart.ToString("MMM dd, yyyy")
                : "No upcoming holiday";

            result.Add(new ClientDto
            {
                Id = client.Id,
                Name = client.Name,
                Description = client.Description,
                TotalHolidayDays = totalDays,
                UpcomingHoliday = upcomingStr,
                LongestHolidayDays = longestDays,
                LastUpdated = client.UpdatedAt
            });
        }

        return result;
    }

    public async Task<(bool Success, string? Error, ClientDto? Data)> CreateAsync(CreateClientRequest request)
    {
        var nameTrimmed = request.Name.Trim();
        var exists = await _db.Clients.AnyAsync(c => c.Name.ToLower() == nameTrimmed.ToLower());
        if (exists)
        {
            return (false, "A client with this name already exists.", null);
        }

        var client = new Client
        {
            Name = nameTrimmed,
            Description = request.Description.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Clients.Add(client);
        await _db.SaveChangesAsync();

        return (true, null, new ClientDto
        {
            Id = client.Id,
            Name = client.Name,
            Description = client.Description,
            TotalHolidayDays = 0,
            UpcomingHoliday = "No upcoming holiday",
            LongestHolidayDays = 0,
            LastUpdated = client.UpdatedAt
        });
    }

    public async Task<(bool Success, string? Error, ClientDto? Data)> UpdateAsync(int id, UpdateClientRequest request)
    {
        var client = await _db.Clients.FindAsync(id);
        if (client == null)
        {
            return (false, "Client not found.", null);
        }

        var nameTrimmed = request.Name.Trim();
        var exists = await _db.Clients.AnyAsync(c => c.Name.ToLower() == nameTrimmed.ToLower() && c.Id != id);
        if (exists)
        {
            return (false, "Another client with this name already exists.", null);
        }

        client.Name = nameTrimmed;
        client.Description = request.Description.Trim();
        client.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        // Fetch refreshed stats
        var allClients = await GetAllAsync();
        var updatedClient = allClients.FirstOrDefault(c => c.Id == id);

        return (true, null, updatedClient);
    }

    public async Task<(bool Success, string? Error)> DeleteAsync(int id)
    {
        var client = await _db.Clients.Include(c => c.Holidays).FirstOrDefaultAsync(c => c.Id == id);
        if (client == null)
        {
            return (false, "Client not found.");
        }

        _db.Holidays.RemoveRange(client.Holidays);
        _db.Clients.Remove(client);
        await _db.SaveChangesAsync();

        return (true, null);
    }
}
