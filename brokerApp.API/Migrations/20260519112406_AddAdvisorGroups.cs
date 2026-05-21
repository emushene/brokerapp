using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace brokerApp.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAdvisorGroups : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AdvisorGroupId",
                table: "Submissions",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AdvisorGroups",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdvisorGroups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AdvisorGroupMembers",
                columns: table => new
                {
                    AdvisorGroupId = table.Column<int>(type: "integer", nullable: false),
                    MembersId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdvisorGroupMembers", x => new { x.AdvisorGroupId, x.MembersId });
                    table.ForeignKey(
                        name: "FK_AdvisorGroupMembers_AdvisorGroups_AdvisorGroupId",
                        column: x => x.AdvisorGroupId,
                        principalTable: "AdvisorGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AdvisorGroupMembers_Advisors_MembersId",
                        column: x => x.MembersId,
                        principalTable: "Advisors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Submissions_AdvisorGroupId",
                table: "Submissions",
                column: "AdvisorGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_AdvisorGroupMembers_MembersId",
                table: "AdvisorGroupMembers",
                column: "MembersId");

            migrationBuilder.AddForeignKey(
                name: "FK_Submissions_AdvisorGroups_AdvisorGroupId",
                table: "Submissions",
                column: "AdvisorGroupId",
                principalTable: "AdvisorGroups",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Submissions_AdvisorGroups_AdvisorGroupId",
                table: "Submissions");

            migrationBuilder.DropTable(
                name: "AdvisorGroupMembers");

            migrationBuilder.DropTable(
                name: "AdvisorGroups");

            migrationBuilder.DropIndex(
                name: "IX_Submissions_AdvisorGroupId",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "AdvisorGroupId",
                table: "Submissions");
        }
    }
}
