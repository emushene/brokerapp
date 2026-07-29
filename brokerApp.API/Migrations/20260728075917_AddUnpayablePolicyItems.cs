using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace brokerApp.API.Migrations
{
    /// <inheritdoc />
    public partial class AddUnpayablePolicyItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UnpayablePolicyItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CommissionStatementId = table.Column<int>(type: "integer", nullable: false),
                    PolicyNumber = table.Column<string>(type: "text", nullable: false),
                    PolicyId = table.Column<string>(type: "text", nullable: true),
                    ClientName = table.Column<string>(type: "text", nullable: false),
                    ClientMobile = table.Column<string>(type: "text", nullable: true),
                    Premium = table.Column<decimal>(type: "numeric", nullable: false),
                    PremiumBalance = table.Column<decimal>(type: "numeric", nullable: false),
                    Reason = table.Column<string>(type: "text", nullable: false),
                    PolicyStatus = table.Column<string>(type: "text", nullable: true),
                    Paymethod = table.Column<string>(type: "text", nullable: true),
                    CapturedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    InceptionDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MatchedSubmissionId = table.Column<int>(type: "integer", nullable: true),
                    AdvisorName = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UnpayablePolicyItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UnpayablePolicyItems_CommissionStatements_CommissionStateme~",
                        column: x => x.CommissionStatementId,
                        principalTable: "CommissionStatements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UnpayablePolicyItems_Submissions_MatchedSubmissionId",
                        column: x => x.MatchedSubmissionId,
                        principalTable: "Submissions",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_UnpayablePolicyItems_CommissionStatementId",
                table: "UnpayablePolicyItems",
                column: "CommissionStatementId");

            migrationBuilder.CreateIndex(
                name: "IX_UnpayablePolicyItems_MatchedSubmissionId",
                table: "UnpayablePolicyItems",
                column: "MatchedSubmissionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UnpayablePolicyItems");
        }
    }
}
