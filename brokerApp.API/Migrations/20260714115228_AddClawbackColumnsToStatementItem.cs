using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace brokerApp.API.Migrations
{
    /// <inheritdoc />
    public partial class AddClawbackColumnsToStatementItem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ClawBack",
                table: "StatementItems",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClawBackReason",
                table: "StatementItems",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ClawBackRetention",
                table: "StatementItems",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SalesForceName",
                table: "StatementItems",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ClawBack",
                table: "StatementItems");

            migrationBuilder.DropColumn(
                name: "ClawBackReason",
                table: "StatementItems");

            migrationBuilder.DropColumn(
                name: "ClawBackRetention",
                table: "StatementItems");

            migrationBuilder.DropColumn(
                name: "SalesForceName",
                table: "StatementItems");
        }
    }
}
