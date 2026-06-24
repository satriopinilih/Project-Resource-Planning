using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Entities.Migrations
{
    /// <inheritdoc />
    public partial class UpdateHolidayRangeAndClient : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Date",
                table: "Holidays",
                newName: "DateStart");

            migrationBuilder.AddColumn<string>(
                name: "Client",
                table: "Holidays",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "DateEnd",
                table: "Holidays",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.UpdateData(
                table: "Holidays",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "Client", "DateEnd" },
                values: new object[] { "Internal", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) });

            migrationBuilder.UpdateData(
                table: "Holidays",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Client", "DateEnd" },
                values: new object[] { "Internal", new DateTime(2026, 4, 3, 0, 0, 0, 0, DateTimeKind.Utc) });

            migrationBuilder.UpdateData(
                table: "Holidays",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Client", "DateEnd" },
                values: new object[] { "Internal", new DateTime(2026, 4, 5, 0, 0, 0, 0, DateTimeKind.Utc) });

            migrationBuilder.UpdateData(
                table: "Holidays",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "Client", "DateEnd" },
                values: new object[] { "Internal", new DateTime(2026, 5, 1, 0, 0, 0, 0, DateTimeKind.Utc) });

            migrationBuilder.UpdateData(
                table: "Holidays",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "Client", "DateEnd" },
                values: new object[] { "Internal", new DateTime(2026, 8, 17, 0, 0, 0, 0, DateTimeKind.Utc) });

            migrationBuilder.UpdateData(
                table: "Holidays",
                keyColumn: "Id",
                keyValue: 6,
                columns: new[] { "Client", "DateEnd" },
                values: new object[] { "Internal", new DateTime(2026, 12, 25, 0, 0, 0, 0, DateTimeKind.Utc) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Client",
                table: "Holidays");

            migrationBuilder.DropColumn(
                name: "DateEnd",
                table: "Holidays");

            migrationBuilder.RenameColumn(
                name: "DateStart",
                table: "Holidays",
                newName: "Date");
        }
    }
}
