using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Entities;
using Commons.Enums;

namespace backend.Controllers;

[ApiController]
[Route("api/timeline")]
public class PMProjectController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public PMProjectController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("projects")]
    public async Task<IActionResult> GetProjectTimeline()
    {
        var projectsData = await _context.Projects.ToListAsync();

        var result = projectsData.Select(p => new {
            label = p.ProjectName,
            subLabel = p.ClientOrganization,
            bars = new[] {
                new {
                    title = p.ProjectName,
                    status = p.ProjectStatus.ToString(), 
                    startDate = p.EstimatedStartDate.ToString("yyyy-MM-dd"),
                    // Menggunakan fungsi hitung minggu yang baru
                    endDate = CalculateEndDateFromWeeks(p.EstimatedStartDate, p.EstimatedDuration).ToString("yyyy-MM-dd")
                }
            }
        });

        return Ok(result);
    }

    [HttpGet("resources")]
    public async Task<IActionResult> GetResourceTimeline()
    {
        var userData = await _context.Users
            // 1. Ambil data Project yang dikerjakan user
            .Include(u => u.UserProjects)
                .ThenInclude(up => up.Project)
            // 2. Ambil data Role Staff (untuk subLabel)
            .Include(u => u.UserStaffRoles)
                .ThenInclude(usr => usr.StaffRole)
            .Where(u => u.UserProjects.Any())
            .ToListAsync();

        var result = userData.Select(u => new {
            label = u.UserName,
            // Ambil nama role pertama dari list UserStaffRoles
            // Jika user punya banyak role, kita gabungkan pakai string.Join atau ambil yang pertama
            subLabel = u.UserStaffRoles.Select(usr => usr.StaffRole.RoleName).FirstOrDefault() ?? u.ExperienceLevel,
            
            bars = u.UserProjects
                .Select(up => new {
                    title = up.Project.ProjectName,
                    status = up.Project.ProjectStatus.ToString(),
                    startDate = (up.StartDate ?? up.Project.EstimatedStartDate).ToString("yyyy-MM-dd"),
                    endDate = (up.EndDate ?? CalculateEndDateFromWeeks(up.Project.EstimatedStartDate, up.Project.EstimatedDuration)).ToString("yyyy-MM-dd")
                })
                .ToList()
        });

        return Ok(result);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetDashboardStats()
    {
        var today = DateTime.UtcNow;
        var projects = await _context.Projects.ToListAsync();

        var total = projects.Count;

        // Statistics derived directly from database ProjectStatus enum
        var onHold = projects.Count(p => 
            p.ProjectStatus == ProjectStatus.Pending);

        var scheduled = projects.Count(p => 
            p.ProjectStatus == ProjectStatus.Scheduled);

        var running = projects.Count(p => 
            p.ProjectStatus == ProjectStatus.Running);

        var completed = projects.Count(p => 
            p.ProjectStatus == ProjectStatus.Completed);

        return Ok(new {
            total,
            onHold,
            scheduled,
            running,
            completed
        });
    }

    /// <summary>
    /// PERBAIKAN DI SINI:
    /// Menghitung tanggal akhir berdasarkan durasi MINGGU.
    /// 1 Minggu dihitung sebagai 5 hari kerja (melompati Sabtu/Minggu).
    /// </summary>
    private static DateTime CalculateEndDateFromWeeks(DateTime startDate, int durationInWeeks)
    {
        if (durationInWeeks <= 0) return startDate;
        
        // Kita konversi minggu ke jumlah hari kerja (1 minggu = 5 hari kerja)
        int totalWorkDaysNeeded = durationInWeeks * 5;
        
        DateTime result = startDate;
        int addedWorkDays = 0;

        // Cek hari pertama, kalau hari kerja, hitung sebagai hari ke-1
        if (result.DayOfWeek != DayOfWeek.Saturday && result.DayOfWeek != DayOfWeek.Sunday)
        {
            addedWorkDays = 1;
        }

        while (addedWorkDays < totalWorkDaysNeeded)
        {
            result = result.AddDays(1);
            if (result.DayOfWeek != DayOfWeek.Saturday && result.DayOfWeek != DayOfWeek.Sunday)
            {
                addedWorkDays++;
            }
        }

        return result;
    }
}