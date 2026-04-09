using Contracts.DTOs.Common;
using Contracts.DTOs.ContractExtension;
using Entities;
using Entities.Entities;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ContractExtensionsController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public ContractExtensionsController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ContractExtensionDto>>>> GetAll([FromQuery] string? status)
    {
        var query = _db.ContractExtensions
            .Include(c => c.User)
            .Include(c => c.RequestedByUser)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(c => c.Status == status);
        }

        var rows = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
        var data = rows.Select(MapToDto).ToList();
        return Ok(ApiResponse<List<ContractExtensionDto>>.SuccessResponse(data));
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ApiResponse<ContractExtensionDto>>> Create([FromBody] CreateContractExtensionDto request)
    {
        var isGm = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "GM");
        if (!isGm)
        {
            return StatusCode(403, ApiResponse<ContractExtensionDto>.ErrorResponse("Only GM can request contract extensions"));
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == request.UserId);
        if (user is null)
        {
            return BadRequest(ApiResponse<ContractExtensionDto>.ErrorResponse("Employee not found"));
        }

        var requestedBy = User.FindFirstValue(ClaimTypes.NameIdentifier) 
            ?? User.Claims.FirstOrDefault(c => c.Type == "sub")?.Value 
            ?? "system";

        var row = new ContractExtension
        {
            UserId = request.UserId,
            RequestedBy = requestedBy,
            ExtensionDuration = request.ExtensionDuration,
            ReasonForExtension = request.ReasonForExtension,
            Status = "Pending",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = requestedBy,
            UpdatedBy = requestedBy
        };

        _db.ContractExtensions.Add(row);
        await _db.SaveChangesAsync();

        var created = await _db.ContractExtensions
            .Include(c => c.User)
            .Include(c => c.RequestedByUser)
            .FirstOrDefaultAsync(c => c.ContractExtensionRequestID == row.ContractExtensionRequestID);

        if (created == null) return StatusCode(500, ApiResponse<ContractExtensionDto>.ErrorResponse("Failed to retrieve created record"));

        return Ok(ApiResponse<ContractExtensionDto>.SuccessResponse(MapToDto(created), "Extension request created"));
    }

    [HttpPost("approve")]
    public async Task<ActionResult<ApiResponse<ContractExtensionDto>>> Approve([FromBody] ApproveContractExtensionDto request)
    {
        var row = await _db.ContractExtensions
            .Include(c => c.User)
            .Include(c => c.RequestedByUser)
            .FirstOrDefaultAsync(c => c.ContractExtensionRequestID == request.ContractExtensionRequestID);

        if (row is null)
        {
            return NotFound(ApiResponse<ContractExtensionDto>.ErrorResponse("Request not found"));
        }

        if (row.Status != "Pending")
        {
            return BadRequest(ApiResponse<ContractExtensionDto>.ErrorResponse("Request already processed"));
        }

        row.Status = "Approved";
        row.ProcessedAt = DateTime.UtcNow;
        row.ProcessedBy = User.Claims.FirstOrDefault(c => c.Type == "sub")?.Value ?? "system";
        row.UpdatedAt = DateTime.UtcNow;
        row.UpdatedBy = row.ProcessedBy;

        row.User.ContractEnd = row.User.ContractEnd.AddMonths(row.ExtensionDuration);
        row.User.ContractStatus = Commons.Enums.ContractStatus.Active;
        row.User.UpdatedAt = DateTime.UtcNow;
        row.User.UpdatedBy = row.ProcessedBy;

        await _db.SaveChangesAsync();
        return Ok(ApiResponse<ContractExtensionDto>.SuccessResponse(MapToDto(row), "Request approved"));
    }

    [HttpPost("decline")]
    public async Task<ActionResult<ApiResponse<ContractExtensionDto>>> Decline([FromBody] DeclineContractExtensionDto request)
    {
        var row = await _db.ContractExtensions
            .Include(c => c.User)
            .Include(c => c.RequestedByUser)
            .FirstOrDefaultAsync(c => c.ContractExtensionRequestID == request.ContractExtensionRequestID);

        if (row is null)
        {
            return NotFound(ApiResponse<ContractExtensionDto>.ErrorResponse("Request not found"));
        }

        if (row.Status != "Pending")
        {
            return BadRequest(ApiResponse<ContractExtensionDto>.ErrorResponse("Request already processed"));
        }

        row.Status = "Declined";
        row.DeclineReason = request.DeclineReason;
        row.ProcessedAt = DateTime.UtcNow;
        row.ProcessedBy = User.Claims.FirstOrDefault(c => c.Type == "sub")?.Value ?? "system";
        row.UpdatedAt = DateTime.UtcNow;
        row.UpdatedBy = row.ProcessedBy;

        await _db.SaveChangesAsync();
        return Ok(ApiResponse<ContractExtensionDto>.SuccessResponse(MapToDto(row), "Request declined"));
    }

    private static ContractExtensionDto MapToDto(ContractExtension c)
    {
        return new ContractExtensionDto
        {
            ContractExtensionRequestID = c.ContractExtensionRequestID,
            RequestedBy = c.RequestedBy,
            RequestedByName = c.RequestedByUser?.UserName ?? c.RequestedBy,
            UserId = c.UserId,
            UserName = c.User?.UserName ?? c.UserId,
            ExtensionDuration = c.ExtensionDuration,
            ReasonForExtension = c.ReasonForExtension,
            CreatedAt = c.CreatedAt,
            Status = c.Status
        };
    }
}
