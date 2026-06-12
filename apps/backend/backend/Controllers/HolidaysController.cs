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
                return StatusCode(500, ApiResponse<List<HolidayDto>>.ErrorResponse(error!));

            return Ok(ApiResponse<List<HolidayDto>>.SuccessResponse(data!));
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while creating the holiday.");
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateHoliday(int id, [FromBody] UpdateHolidayRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var (success, error, data) = await _service.UpdateAsync(id, request);
            if (!success)
                return BadRequest(ApiResponse<HolidayDto>.ErrorResponse(error!));

            return Ok(ApiResponse<HolidayDto>.SuccessResponse(data!));
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while updating the holiday.");
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteHoliday(int id)
    {
        try
        {
            var (success, error) = await _service.DeleteAsync(id);
            if (!success)
                return BadRequest(ApiResponse<string>.ErrorResponse(error!));

            return Ok(ApiResponse<string>.SuccessResponse("Holiday deleted successfully"));
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while deleting the holiday.");
        }
    }

    [HttpPost("bulk")]
    public async Task<IActionResult> BulkCreateHolidays([FromBody] BulkCreateHolidaysRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var (success, error, data) = await _service.BulkCreateAsync(request);
            if (!success)
                return StatusCode(500, ApiResponse<List<HolidayDto>>.ErrorResponse(error!));

            return Ok(ApiResponse<List<HolidayDto>>.SuccessResponse(data!));
        }
        catch (Exception ex)
        {
            return StatusCode(500, "An error occurred while uploading holidays: " + ex.Message);
        }
    }
}
