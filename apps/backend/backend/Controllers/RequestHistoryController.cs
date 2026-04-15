using backend.Services;
using Contracts.DTOs.Common;
using Contracts.DTOs.RequestHistory;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>
/// Provides combined request history for contract extensions and hire requests.
/// All endpoints require authentication.
/// Controller is thin — all DB logic lives in RequestHistoryService.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RequestHistoryController : ControllerBase
{
    private readonly RequestHistoryService _service;

    public RequestHistoryController(RequestHistoryService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<RequestHistoryItemDto>>>> Get([FromQuery] string scope = "HR")
    {
        var result = await _service.GetAsync(scope);
        return Ok(ApiResponse<List<RequestHistoryItemDto>>.SuccessResponse(result));
    }
}
