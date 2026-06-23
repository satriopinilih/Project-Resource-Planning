using backend.Services;
using Contracts.DTOs.Common;
using Contracts.DTOs.Client;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>
/// Handles Client CRUD. All endpoints require authentication.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ClientsController : ControllerBase
{
    private readonly ClientService _service;

    public ClientsController(ClientService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ClientDto>>>> GetAll()
    {
        try
        {
            var data = await _service.GetAllAsync();
            return Ok(ApiResponse<List<ClientDto>>.SuccessResponse(data));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<List<ClientDto>>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateClient([FromBody] CreateClientRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var (success, error, data) = await _service.CreateAsync(request);
            if (!success)
                return BadRequest(ApiResponse<ClientDto>.ErrorResponse(error!));

            return Ok(ApiResponse<ClientDto>.SuccessResponse(data!));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<ClientDto>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateClient(int id, [FromBody] UpdateClientRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var (success, error, data) = await _service.UpdateAsync(id, request);
            if (!success)
                return BadRequest(ApiResponse<ClientDto>.ErrorResponse(error!));

            return Ok(ApiResponse<ClientDto>.SuccessResponse(data!));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<ClientDto>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteClient(int id)
    {
        try
        {
            var (success, error) = await _service.DeleteAsync(id);
            if (!success)
                return BadRequest(ApiResponse<string>.ErrorResponse(error!));

            return Ok(ApiResponse<string>.SuccessResponse("Client deleted successfully"));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<string>.ErrorResponse($"An error occurred: {ex.Message}"));
        }
    }
}
