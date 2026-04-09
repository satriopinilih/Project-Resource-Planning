using System;
using System.Collections.Generic;
using System.Text;

namespace Entities.Entities
{
    public class Holiday
    {
        public int Id { get; set; }
        public string Name { get; set; } // e.g., "Hari Raya Idul Fitri"
        public DateTime Date { get; set; }
    }
}
