using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json.Serialization;

namespace Commons.Enums
{
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum WorkingType
    {
        Dedicated,      // User cannot be assigned to any other project
        NonDedicated    // User can be assigned to multiple projects
    }
}
