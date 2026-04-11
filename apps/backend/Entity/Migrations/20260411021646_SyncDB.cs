using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Entities.Migrations
{
    /// <inheritdoc />
    public partial class SyncDB : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HireRequests");

            migrationBuilder.DropTable(
                name: "ProjectRequiredSkills");

            migrationBuilder.DropColumn(
                name: "EndDate",
                table: "UserProjects");

            migrationBuilder.DropColumn(
                name: "StartDate",
                table: "UserProjects");
        }
    }
}
