using backend.Services;
using Contracts.DTOs.Common;
using Contracts.DTOs.Project;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>
/// Provides smart team recommendations for projects.
/// All endpoints require authentication.
/// Controller is thin — all scoring/recommendation logic lives in RecommendationService.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RecommendationsController : ControllerBase
{
    private readonly RecommendationService _service;

    public RecommendationsController(RecommendationService service)
    {
        _service = service;
    }

    /// <summary>
    /// GET /api/recommendations/{projectId}
    /// Returns smart team recommendations for a project based on required roles,
    /// staff skills, experience, and current availability.
    /// </summary>
    [HttpGet("{projectId}")]
    public async Task<ActionResult<ApiResponse<RecommendationResponse>>> GetRecommendations(int projectId)
    {
        var (success, error, statusCode, data) = await _service.GetRecommendationsAsync(projectId);

        if (!success)
            return StatusCode(statusCode, ApiResponse<RecommendationResponse>.ErrorResponse(error!));

        return Ok(ApiResponse<RecommendationResponse>.SuccessResponse(data!));
    }
}
