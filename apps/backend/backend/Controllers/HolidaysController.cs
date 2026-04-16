using backend.Services;
using Contracts.DTOs.Common;
using Contracts.DTOs.Holiday;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>
/// Handles holiday CRUD. All endpoints require authentication.
/// Controller is thin — all DB logic lives in HolidayService.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class HolidaysController : ControllerBase
{
    private readonly HolidayService _service;

    public HolidaysController(HolidayService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<HolidayDto>>>> GetAll()
    {
        var data = await _service.GetAllAsync();
        return Ok(ApiResponse<List<HolidayDto>>.SuccessResponse(data));
    }

    [HttpPost]
    public async Task<IActionResult> CreateHoliday([FromBody] CreateHolidayRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var (success, error, data) = await _service.CreateAsync(request);
            if (!success)
                return StatusCode(500, ApiResponse<HolidayDto>.ErrorResponse(error!));

            return Ok(ApiResponse<HolidayDto>.SuccessResponse(data!));
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while creating the holiday.");
        }
    }
}
