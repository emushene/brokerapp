using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace brokerApp.API.Migrations
{
    /// <inheritdoc />
    public partial class AddFileUrlToCommissionStatement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AdvisorName",
                table: "StatementItems",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AdvisorName",
                table: "MovementItems",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FileUrl",
                table: "CommissionStatements",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AdvisorName",
                table: "StatementItems");

            migrationBuilder.DropColumn(
                name: "AdvisorName",
                table: "MovementItems");

            migrationBuilder.DropColumn(
                name: "FileUrl",
                table: "CommissionStatements");
        }
    }
}
