using System.Security.Claims;
using backend.Services;
using Contracts.DTOs.Common;
using Contracts.DTOs.ContractExtension;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>
/// Handles contract extension CRUD. All endpoints require authentication.
/// Controller is thin — all DB logic lives in ContractExtensionService.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ContractExtensionsController : ControllerBase
{
    private readonly ContractExtensionService _service;

    public ContractExtensionsController(ContractExtensionService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ContractExtensionDto>>>> GetAll([FromQuery] string? status)
    {
        var data = await _service.GetAllAsync(status);
        return Ok(ApiResponse<List<ContractExtensionDto>>.SuccessResponse(data));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<ContractExtensionDto>>> Create([FromBody] CreateContractExtensionDto request)
    {
        var isGm = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "GM");
        if (!isGm)
            return StatusCode(403, ApiResponse<ContractExtensionDto>.ErrorResponse("Only GM can request contract extensions"));

        var requestedBy = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.Claims.FirstOrDefault(c => c.Type == "sub")?.Value
            ?? "system";

        var (success, error, statusCode, data) = await _service.CreateAsync(request, requestedBy);

        if (!success)
            return StatusCode(statusCode, ApiResponse<ContractExtensionDto>.ErrorResponse(error!));

        return Ok(ApiResponse<ContractExtensionDto>.SuccessResponse(data!, "Extension request created"));
    }

    [HttpPost("approve")]
    public async Task<ActionResult<ApiResponse<ContractExtensionDto>>> Approve([FromBody] ApproveContractExtensionDto request)
    {
        var processedBy = User.Claims.FirstOrDefault(c => c.Type == "sub")?.Value ?? "system";
        var (success, error, statusCode, data) = await _service.ApproveAsync(request, processedBy);

        if (!success)
            return StatusCode(statusCode, ApiResponse<ContractExtensionDto>.ErrorResponse(error!));

        return Ok(ApiResponse<ContractExtensionDto>.SuccessResponse(data!, "Request approved"));
    }

    [HttpPost("decline")]
    public async Task<ActionResult<ApiResponse<ContractExtensionDto>>> Decline([FromBody] DeclineContractExtensionDto request)
    {
        var processedBy = User.Claims.FirstOrDefault(c => c.Type == "sub")?.Value ?? "system";
        var (success, error, statusCode, data) = await _service.DeclineAsync(request, processedBy);

        if (!success)
            return StatusCode(statusCode, ApiResponse<ContractExtensionDto>.ErrorResponse(error!));

        return Ok(ApiResponse<ContractExtensionDto>.SuccessResponse(data!, "Request declined"));
    }
}
