using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Entities.Migrations
{
    /// <inheritdoc />
    public partial class RefactorProjectSkillsToProjectLevel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProjectRequiredSkills_ProjectRequiredRoles_ProjectRequiredR~",
                table: "ProjectRequiredSkills");

            migrationBuilder.RenameColumn(
                name: "ProjectRequiredRoleId",
                table: "ProjectRequiredSkills",
                newName: "ProjectId");

            migrationBuilder.RenameIndex(
                name: "IX_ProjectRequiredSkills_ProjectRequiredRoleId",
                table: "ProjectRequiredSkills",
                newName: "IX_ProjectRequiredSkills_ProjectId");

            migrationBuilder.AddForeignKey(
                name: "FK_ProjectRequiredSkills_Projects_ProjectId",
                table: "ProjectRequiredSkills",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "ProjectID",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProjectRequiredSkills_Projects_ProjectId",
                table: "ProjectRequiredSkills");

            migrationBuilder.RenameColumn(
                name: "ProjectId",
                table: "ProjectRequiredSkills",
                newName: "ProjectRequiredRoleId");

            migrationBuilder.RenameIndex(
                name: "IX_ProjectRequiredSkills_ProjectId",
                table: "ProjectRequiredSkills",
                newName: "IX_ProjectRequiredSkills_ProjectRequiredRoleId");

            migrationBuilder.AddForeignKey(
                name: "FK_ProjectRequiredSkills_ProjectRequiredRoles_ProjectRequiredR~",
                table: "ProjectRequiredSkills",
                column: "ProjectRequiredRoleId",
                principalTable: "ProjectRequiredRoles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
