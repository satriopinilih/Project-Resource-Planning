using System;
using System.Collections.Generic;
using System.Text;

namespace Commons.Enums
{
    public enum WorkingType
    {
        Dedicated,      // User cannot be assigned to any other project
        NonDedicated    // User can be assigned to multiple projects
    }
}
