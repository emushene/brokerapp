using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace brokerApp.API.Migrations
{
    /// <inheritdoc />
    public partial class AddOptimizedSearchIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:pg_trgm", ",,");

            migrationBuilder.CreateIndex(
                name: "IX_Submissions_ApplicantSurname",
                table: "Submissions",
                column: "ApplicantSurname")
                .Annotation("Npgsql:IndexMethod", "gin")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });

            migrationBuilder.CreateIndex(
                name: "IX_Submissions_CreatedAt",
                table: "Submissions",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Submissions_Initials",
                table: "Submissions",
                column: "Initials")
                .Annotation("Npgsql:IndexMethod", "gin")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });

            migrationBuilder.CreateIndex(
                name: "IX_Submissions_PolicyNumber",
                table: "Submissions",
                column: "PolicyNumber")
                .Annotation("Npgsql:IndexMethod", "gin")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Submissions_ApplicantSurname",
                table: "Submissions");

            migrationBuilder.DropIndex(
                name: "IX_Submissions_CreatedAt",
                table: "Submissions");

            migrationBuilder.DropIndex(
                name: "IX_Submissions_Initials",
                table: "Submissions");

            migrationBuilder.DropIndex(
                name: "IX_Submissions_PolicyNumber",
                table: "Submissions");

            migrationBuilder.AlterDatabase()
                .OldAnnotation("Npgsql:PostgresExtension:pg_trgm", ",,");
        }
    }
}
