using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace brokerApp.API.Migrations
{
    /// <inheritdoc />
    public partial class AddFileUrlsToItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FileUrl",
                table: "StatementItems",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GoogleDriveLink",
                table: "StatementItems",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Premium",
                table: "StatementItems",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "FileUrl",
                table: "MovementItems",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GoogleDriveLink",
                table: "MovementItems",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FileUrl",
                table: "StatementItems");

            migrationBuilder.DropColumn(
                name: "GoogleDriveLink",
                table: "StatementItems");

            migrationBuilder.DropColumn(
                name: "Premium",
                table: "StatementItems");

            migrationBuilder.DropColumn(
                name: "FileUrl",
                table: "MovementItems");

            migrationBuilder.DropColumn(
                name: "GoogleDriveLink",
                table: "MovementItems");
        }
    }
}
