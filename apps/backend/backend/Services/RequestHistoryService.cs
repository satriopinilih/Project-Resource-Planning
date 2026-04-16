using Contracts.DTOs.RequestHistory;
using Entities;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public class RequestHistoryService
{
    private readonly ApplicationDbContext _db;

    public RequestHistoryService(ApplicationDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Retrieves combined request history (contract extensions + hire requests).
    /// Uses AsNoTracking since this is a read-only display query.
    /// </summary>
    public async Task<List<RequestHistoryItemDto>> GetAsync(string scope)
    {
        var contractRows = await _db.ContractExtensions
            .AsNoTracking()
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
            ProjectName = "-",
            Reason = c.ReasonForExtension,
            ReviewNote = c.DeclineReason ?? "-",
            RequestedDate = c.CreatedAt,
            Status = c.Status,
            ReviewedDate = c.ProcessedAt
        });

        var hireRows = await _db.HireRequests
            .AsNoTracking()
            .Where(h => (h.Status == "Fulfilled" || h.Status == "Declined")
                        && h.RoleNeeded != "Timeline Edit Request"
                        && h.RoleNeeded != "GM Notification")
            .OrderByDescending(h => h.CreatedAt)
            .ToListAsync();

        var hireHistory = hireRows.Select(h => new RequestHistoryItemDto
        {
            RequestType = "Hire New Person",
            ReferenceId = $"HIRE-{h.HireRequestId}",
            EmployeeId = "-",
            EmployeeName = !string.IsNullOrWhiteSpace(h.HiredEmployeeName) ? h.HiredEmployeeName : "-",
            StaffRole = h.RoleNeeded,
            Extension = "-",
            ProjectName = h.ProjectName,
            Reason = h.Notes,
            ReviewNote = h.Status == "Declined" ? (h.Notes ?? "-") : "-",
            RequestedDate = h.CreatedAt,
            Status = h.Status,
            ReviewedDate = h.FulfilledAt
        });

        return contractHistory
            .Concat(hireHistory)
            .OrderByDescending(r => r.RequestedDate)
            .ToList();
    }
}
