using backend.Services;
using Contracts.DTOs.Common;
using Contracts.DTOs.ProjectPhase;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>
/// Master data CRUD for project phases. Accessible by all authenticated users
/// for GET (to populate dropdowns). POST/PUT/DELETE are intended for GM/Admin only.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProjectPhasesController : ControllerBase
{
    private readonly ProjectPhaseService _service;

    public ProjectPhasesController(ProjectPhaseService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ProjectPhaseDto>>>> GetAll()
    {
        var data = await _service.GetAllAsync();
        return Ok(ApiResponse<List<ProjectPhaseDto>>.SuccessResponse(data));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProjectPhaseRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var (success, error, data) = await _service.CreateAsync(request);
            if (!success)
                return BadRequest(ApiResponse<ProjectPhaseDto>.ErrorResponse(error!));

            return Ok(ApiResponse<ProjectPhaseDto>.SuccessResponse(data!));
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while creating the project phase.");
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateProjectPhaseRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var (success, error, data) = await _service.UpdateAsync(id, request);
            if (!success)
                return BadRequest(ApiResponse<ProjectPhaseDto>.ErrorResponse(error!));

            return Ok(ApiResponse<ProjectPhaseDto>.SuccessResponse(data!));
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while updating the project phase.");
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var (success, error) = await _service.DeleteAsync(id);
            if (!success)
                return BadRequest(ApiResponse<string>.ErrorResponse(error!));

            return Ok(ApiResponse<string>.SuccessResponse("Project phase deleted successfully."));
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while deleting the project phase.");
        }
    }
}
