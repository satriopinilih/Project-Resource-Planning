using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Entities.Migrations
{
    /// <inheritdoc />
    public partial class RemoveRequiredSkillAndAlignSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'ProjectRequiredRoles'
          AND column_name = 'RequiredSkill'
    ) THEN
        ALTER TABLE ""ProjectRequiredRoles"" DROP COLUMN ""RequiredSkill"";
    END IF;
END $$;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'ProjectRequiredRoles'
          AND column_name = 'RequiredSkill'
    ) THEN
        ALTER TABLE ""ProjectRequiredRoles"" ADD COLUMN ""RequiredSkill"" text NOT NULL DEFAULT '';
    END IF;
END $$;");
        }
    }
}
