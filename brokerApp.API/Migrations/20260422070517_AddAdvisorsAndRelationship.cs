using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace brokerApp.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAdvisorsAndRelationship : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AdvisorId",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "IntermediaryCode",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "IntermediaryName",
                table: "Submissions");

            migrationBuilder.CreateTable(
                name: "Advisors",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FirebaseId = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Code = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Advisors", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SubmissionAdvisors",
                columns: table => new
                {
                    AdvisorsId = table.Column<int>(type: "integer", nullable: false),
                    SubmissionsId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubmissionAdvisors", x => new { x.AdvisorsId, x.SubmissionsId });
                    table.ForeignKey(
                        name: "FK_SubmissionAdvisors_Advisors_AdvisorsId",
                        column: x => x.AdvisorsId,
                        principalTable: "Advisors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SubmissionAdvisors_Submissions_SubmissionsId",
                        column: x => x.SubmissionsId,
                        principalTable: "Submissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SubmissionAdvisors_SubmissionsId",
                table: "SubmissionAdvisors",
                column: "SubmissionsId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SubmissionAdvisors");

            migrationBuilder.DropTable(
                name: "Advisors");

            migrationBuilder.AddColumn<string>(
                name: "AdvisorId",
                table: "Submissions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "IntermediaryCode",
                table: "Submissions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "IntermediaryName",
                table: "Submissions",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
