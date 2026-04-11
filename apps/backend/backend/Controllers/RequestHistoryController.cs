using Contracts.DTOs.Common;
using Contracts.DTOs.RequestHistory;
using Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RequestHistoryController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public RequestHistoryController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<RequestHistoryItemDto>>>> Get([FromQuery] string scope = "HR")
    {
        var users = await _db.Users
            .Include(u => u.UserStaffRoles)
                .ThenInclude(usr => usr.StaffRole)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .ToListAsync();

        var userNameById = users.ToDictionary(u => u.UserId, u => u.UserName);

        var contractRows = await _db.ContractExtensions
            .Include(c => c.User)
                .ThenInclude(u => u.UserStaffRoles)
                    .ThenInclude(usr => usr.StaffRole)
            .Include(c => c.User)
                .ThenInclude(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        var contractHistory = contractRows.Select(c => new RequestHistoryItemDto
        {
            RequestType = "Contract Extension",
            ReferenceId = $"CE-{c.ContractExtensionRequestID}",
            EmployeeId = c.UserId,
            EmployeeName = c.User?.UserName ?? c.UserId,
            StaffRole = c.User?.UserStaffRoles.Select(x => x.StaffRole.RoleName).FirstOrDefault()
                ?? c.User?.UserRoles.Select(x => x.Role.RoleName.ToString()).FirstOrDefault()
                ?? "Staff",
            Extension = $"{c.ExtensionDuration} months",
            RequestedDate = c.CreatedAt,
            Status = c.Status,
            ReviewedDate = c.ProcessedAt
        });

        var hireRows = await _db.HireRequests
            .OrderByDescending(h => h.CreatedAt)
            .ToListAsync();

        var hireHistory = hireRows.Select(h => new RequestHistoryItemDto
        {
            RequestType = "Hire New Person",
            ReferenceId = $"HIRE-{h.HireRequestId}",
            EmployeeId = h.ProjectId?.ToString() ?? "-",
            EmployeeName = h.ProjectName,
            StaffRole = h.RoleNeeded,
            Extension = "-",
            RequestedDate = h.CreatedAt,
            Status = h.Status,
            ReviewedDate = h.FulfilledAt
        });

        var result = contractHistory
            .Concat(hireHistory)
            .OrderByDescending(r => r.RequestedDate)
            .ToList();

        if (!string.Equals(scope, "HR", StringComparison.OrdinalIgnoreCase))
        {
            return Ok(ApiResponse<List<RequestHistoryItemDto>>.SuccessResponse(result));
        }

        return Ok(ApiResponse<List<RequestHistoryItemDto>>.SuccessResponse(result));
    }
}
