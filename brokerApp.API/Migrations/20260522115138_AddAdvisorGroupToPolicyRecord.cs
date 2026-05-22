using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace brokerApp.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAdvisorGroupToPolicyRecord : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AdvisorGroupId",
                table: "PolicyRecords",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PolicyRecords_AdvisorGroupId",
                table: "PolicyRecords",
                column: "AdvisorGroupId");

            migrationBuilder.AddForeignKey(
                name: "FK_PolicyRecords_AdvisorGroups_AdvisorGroupId",
                table: "PolicyRecords",
                column: "AdvisorGroupId",
                principalTable: "AdvisorGroups",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PolicyRecords_AdvisorGroups_AdvisorGroupId",
                table: "PolicyRecords");

            migrationBuilder.DropIndex(
                name: "IX_PolicyRecords_AdvisorGroupId",
                table: "PolicyRecords");

            migrationBuilder.DropColumn(
                name: "AdvisorGroupId",
                table: "PolicyRecords");
        }
    }
}
