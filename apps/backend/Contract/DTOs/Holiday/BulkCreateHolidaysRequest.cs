using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Contracts.DTOs.Holiday;

public class BulkCreateHolidayItem
{
    [Required]
    [StringLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public DateTime DateStart { get; set; }

    [Required]
    public DateTime DateEnd { get; set; }

    public int? ClientId { get; set; }
}

public class BulkCreateHolidaysRequest
{
    [Required]
    public List<BulkCreateHolidayItem> Holidays { get; set; } = new();
}
