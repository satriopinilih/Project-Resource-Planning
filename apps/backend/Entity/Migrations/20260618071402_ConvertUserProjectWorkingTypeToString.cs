using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Entities.Migrations
{
    /// <inheritdoc />
    public partial class ConvertUserProjectWorkingTypeToString : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // First convert existing integer values to their string equivalents,
            // then alter the column type. PostgreSQL requires the USING clause for type conversion.
            migrationBuilder.Sql(@"
                ALTER TABLE ""UserProjects""
                ALTER COLUMN ""WorkingType"" TYPE text
                USING CASE ""WorkingType""::integer
                    WHEN 0 THEN 'Dedicated'
                    WHEN 1 THEN 'NonDedicated'
                    ELSE 'Dedicated'
                END;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE ""UserProjects""
                ALTER COLUMN ""WorkingType"" TYPE integer
                USING CASE ""WorkingType""
                    WHEN 'Dedicated' THEN 0
                    WHEN 'NonDedicated' THEN 1
                    ELSE 0
                END;
            ");
        }
    }
}
