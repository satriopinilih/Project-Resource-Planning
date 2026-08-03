using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Entities.Migrations
{
    /// <inheritdoc />
    public partial class AddBabysittingAndWarrantyFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"Projects\" ADD COLUMN IF NOT EXISTS \"BabysittingDuration\" integer NOT NULL DEFAULT 0;");
            migrationBuilder.Sql("ALTER TABLE \"Projects\" ADD COLUMN IF NOT EXISTS \"BabysittingEndDate\" timestamp with time zone NULL;");
            migrationBuilder.Sql("ALTER TABLE \"Projects\" ADD COLUMN IF NOT EXISTS \"BabysittingStartDate\" timestamp with time zone NULL;");
            migrationBuilder.Sql("ALTER TABLE \"Projects\" ADD COLUMN IF NOT EXISTS \"WarrantyDuration\" integer NOT NULL DEFAULT 0;");
            migrationBuilder.Sql("ALTER TABLE \"Projects\" ADD COLUMN IF NOT EXISTS \"WarrantyEndDate\" timestamp with time zone NULL;");
            migrationBuilder.Sql("ALTER TABLE \"Projects\" ADD COLUMN IF NOT EXISTS \"WarrantyStartDate\" timestamp with time zone NULL;");
            migrationBuilder.Sql("ALTER TABLE \"ProjectRequiredRoles\" ADD COLUMN IF NOT EXISTS \"Phase\" character varying(50) NOT NULL DEFAULT 'Main';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"Projects\" DROP COLUMN IF EXISTS \"BabysittingDuration\";");
            migrationBuilder.Sql("ALTER TABLE \"Projects\" DROP COLUMN IF EXISTS \"BabysittingEndDate\";");
            migrationBuilder.Sql("ALTER TABLE \"Projects\" DROP COLUMN IF EXISTS \"BabysittingStartDate\";");
            migrationBuilder.Sql("ALTER TABLE \"Projects\" DROP COLUMN IF EXISTS \"WarrantyDuration\";");
            migrationBuilder.Sql("ALTER TABLE \"Projects\" DROP COLUMN IF EXISTS \"WarrantyEndDate\";");
            migrationBuilder.Sql("ALTER TABLE \"Projects\" DROP COLUMN IF EXISTS \"WarrantyStartDate\";");
            migrationBuilder.Sql("ALTER TABLE \"ProjectRequiredRoles\" DROP COLUMN IF EXISTS \"Phase\";");
        }
    }
}
