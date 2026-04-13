using Npgsql;
using System;
using System.Threading.Tasks;

class Program {
    static async Task Main() {
        await using var conn = new NpgsqlConnection("Host=localhost;Database=resources;Username=postgres;Password=12345");
        await conn.OpenAsync();
        
        // Let's add the column RequiredSkill to ProjectRequiredRoles
        string sql = @"ALTER TABLE ""ProjectRequiredRoles"" ADD COLUMN IF NOT EXISTS ""RequiredSkill"" text NOT NULL DEFAULT '';";
        await using var cmd = new NpgsqlCommand(sql, conn);
        await cmd.ExecuteNonQueryAsync();
        
        Console.WriteLine("Updated Database Successfully!");
    }
}
