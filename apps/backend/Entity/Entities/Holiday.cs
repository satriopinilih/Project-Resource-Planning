using System;
using System.Collections.Generic;
using System.Text;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Entities.Entities
{
    public class Holiday
    {
        public int Id { get; set; }
        public required string Name { get; set; } // e.g., "Hari Raya Idul Fitri"
        public DateTime DateStart { get; set; }
        public DateTime DateEnd { get; set; }
        public int? ClientId { get; set; }

        [ForeignKey(nameof(ClientId))]
        [InverseProperty(nameof(Client.Holidays))]
        public virtual Client? Client { get; set; }
    }
}
