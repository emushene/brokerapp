using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace brokerApp.API.Migrations
{
    /// <inheritdoc />
    public partial class AddStorageKeyUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_SubmissionDocuments_StorageKey",
                table: "SubmissionDocuments",
                column: "StorageKey",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SubmissionDocuments_StorageKey",
                table: "SubmissionDocuments");
        }
    }
}
