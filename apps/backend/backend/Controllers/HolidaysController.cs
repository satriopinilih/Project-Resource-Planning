using Contracts.DTOs.Common;
using Contracts.DTOs.Holiday;
using Entities;
using Entities.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HolidaysController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public HolidaysController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<HolidayDto>>>> GetAll()
    {
        var holidays = await _db.Holidays.OrderBy(h => h.Date).ToListAsync();
        var data = holidays.Select(h => new HolidayDto
        {
            Id = h.Id,
            Name = h.Name,
            Date = h.Date
        }).ToList();

        return Ok(ApiResponse<List<HolidayDto>>.SuccessResponse(data));
    }

    [HttpPost]
    public async Task<IActionResult> CreateHoliday([FromBody] CreateHolidayRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var holiday = new Holiday
        {
            Name = request.Name,
            Date = request.Date
        };

        try
        {
            _db.Holidays.Add(holiday);
            await _db.SaveChangesAsync();

            var dto = new HolidayDto
            {
                Id = holiday.Id,
                Name = holiday.Name,
                Date = holiday.Date
            };

            // Using Ok since there is no GetById implemented for Holiday
            return Ok(ApiResponse<HolidayDto>.SuccessResponse(dto));
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while creating the holiday.");
        }
    }
}
