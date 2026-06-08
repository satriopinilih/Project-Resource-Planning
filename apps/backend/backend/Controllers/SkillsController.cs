using backend.Services;
using Contracts.DTOs.Common;
using Contracts.DTOs.Skill;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>
/// Handles skill CRUD. All endpoints require authentication.
/// Controller is thin — all DB logic lives in SkillService.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SkillsController : ControllerBase
{
    private readonly SkillService _service;

    public SkillsController(SkillService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<SkillDto>>>> GetAll()
    {
        var data = await _service.GetAllAsync();
        return Ok(ApiResponse<List<SkillDto>>.SuccessResponse(data));
    }

    [HttpPost]
    public async Task<IActionResult> CreateSkill([FromBody] CreateSkillRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var (success, error, data) = await _service.CreateAsync(request);
            if (!success)
                return BadRequest(ApiResponse<SkillDto>.ErrorResponse(error!));

            return Ok(ApiResponse<SkillDto>.SuccessResponse(data!));
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while creating the skill.");
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateSkill(int id, [FromBody] UpdateSkillRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var (success, error, data) = await _service.UpdateAsync(id, request);
            if (!success)
                return BadRequest(ApiResponse<SkillDto>.ErrorResponse(error!));

            return Ok(ApiResponse<SkillDto>.SuccessResponse(data!));
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while updating the skill.");
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSkill(int id)
    {
        try
        {
            var (success, error) = await _service.DeleteAsync(id);
            if (!success)
                return BadRequest(ApiResponse<string>.ErrorResponse(error!));

            return Ok(ApiResponse<string>.SuccessResponse("Skill deleted successfully"));
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while deleting the skill.");
        }
    }
}
