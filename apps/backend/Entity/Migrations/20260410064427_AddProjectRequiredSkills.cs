using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Entities.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectRequiredSkills : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProjectRequiredSkills",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProjectRequiredRoleId = table.Column<int>(type: "integer", nullable: false),
                    SkillId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectRequiredSkills", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectRequiredSkills_ProjectRequiredRoles_ProjectRequiredR~",
                        column: x => x.ProjectRequiredRoleId,
                        principalTable: "ProjectRequiredRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProjectRequiredSkills_Skills_SkillId",
                        column: x => x.SkillId,
                        principalTable: "Skills",
                        principalColumn: "SkillID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectRequiredSkills_ProjectRequiredRoleId",
                table: "ProjectRequiredSkills",
                column: "ProjectRequiredRoleId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectRequiredSkills_SkillId",
                table: "ProjectRequiredSkills",
                column: "SkillId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProjectRequiredSkills");
        }
    }
}
