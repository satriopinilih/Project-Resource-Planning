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
    public DateTime Date { get; set; }
}

public class BulkCreateHolidaysRequest
{
    [Required]
    public List<BulkCreateHolidayItem> Holidays { get; set; } = new();
}
