using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace brokerApp.API.Migrations
{
    /// <inheritdoc />
    public partial class AddPolicyRecordsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PolicyRecords",
                columns: table => new
                {
                    PolicyNumber = table.Column<string>(type: "text", nullable: false),
                    Surname = table.Column<string>(type: "text", nullable: false),
                    Initials = table.Column<string>(type: "text", nullable: false),
                    Premium = table.Column<decimal>(type: "numeric", nullable: false),
                    LastCommissionAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    LastUpdated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PolicyRecords", x => x.PolicyNumber);
                });

            migrationBuilder.CreateTable(
                name: "PolicyAdvisors",
                columns: table => new
                {
                    AdvisorsId = table.Column<int>(type: "integer", nullable: false),
                    PolicyRecordPolicyNumber = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PolicyAdvisors", x => new { x.AdvisorsId, x.PolicyRecordPolicyNumber });
                    table.ForeignKey(
                        name: "FK_PolicyAdvisors_Advisors_AdvisorsId",
                        column: x => x.AdvisorsId,
                        principalTable: "Advisors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PolicyAdvisors_PolicyRecords_PolicyRecordPolicyNumber",
                        column: x => x.PolicyRecordPolicyNumber,
                        principalTable: "PolicyRecords",
                        principalColumn: "PolicyNumber",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PolicyAdvisors_PolicyRecordPolicyNumber",
                table: "PolicyAdvisors",
                column: "PolicyRecordPolicyNumber");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PolicyAdvisors");

            migrationBuilder.DropTable(
                name: "PolicyRecords");
        }
    }
}
