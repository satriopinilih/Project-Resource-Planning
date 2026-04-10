using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Entities.Migrations
{
    /// <inheritdoc />
    public partial class AddHolidayEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Holidays",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Holidays", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "Holidays",
                columns: new[] { "Id", "Date", "Name" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "New Year's Day" },
                    { 2, new DateTime(2026, 4, 3, 0, 0, 0, 0, DateTimeKind.Utc), "Good Friday" },
                    { 3, new DateTime(2026, 4, 5, 0, 0, 0, 0, DateTimeKind.Utc), "Easter Sunday" },
                    { 4, new DateTime(2026, 5, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Labour Day" },
                    { 5, new DateTime(2026, 8, 17, 0, 0, 0, 0, DateTimeKind.Utc), "Independence Day" },
                    { 6, new DateTime(2026, 12, 25, 0, 0, 0, 0, DateTimeKind.Utc), "Christmas Day" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Holidays");
        }
    }
}
