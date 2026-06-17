using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace brokerApp.API.Migrations
{
    /// <inheritdoc />
    public partial class UpdateToGcpStorage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "GoogleFileId",
                table: "SubmissionDocuments",
                newName: "StorageKey");

            migrationBuilder.RenameColumn(
                name: "GoogleDriveLink",
                table: "SubmissionDocuments",
                newName: "FileUrl");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "StorageKey",
                table: "SubmissionDocuments",
                newName: "GoogleFileId");

            migrationBuilder.RenameColumn(
                name: "FileUrl",
                table: "SubmissionDocuments",
                newName: "GoogleDriveLink");
        }
    }
}
