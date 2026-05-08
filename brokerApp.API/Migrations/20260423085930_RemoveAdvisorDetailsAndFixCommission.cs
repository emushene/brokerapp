using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace brokerApp.API.Migrations
{
    /// <inheritdoc />
    public partial class RemoveAdvisorDetailsAndFixCommission : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CommissionPercentage",
                table: "Advisors");

            migrationBuilder.DropColumn(
                name: "Email",
                table: "Advisors");

            migrationBuilder.DropColumn(
                name: "GoogleDriveLink",
                table: "Advisors");

            migrationBuilder.DropColumn(
                name: "IdNumber",
                table: "Advisors");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "CommissionPercentage",
                table: "Advisors",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Advisors",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "GoogleDriveLink",
                table: "Advisors",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "IdNumber",
                table: "Advisors",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
