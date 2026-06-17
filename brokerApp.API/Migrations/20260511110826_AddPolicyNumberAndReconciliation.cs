using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace brokerApp.API.Migrations
{
    /// <inheritdoc />
    public partial class AddPolicyNumberAndReconciliation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PolicyNumber",
                table: "Submissions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "CommissionStatements",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FileName = table.Column<string>(type: "text", nullable: false),
                    StatementDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UploadDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TotalCommission = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalRows = table.Column<int>(type: "integer", nullable: false),
                    MatchedRows = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommissionStatements", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "StatementItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CommissionStatementId = table.Column<int>(type: "integer", nullable: false),
                    ClientName = table.Column<string>(type: "text", nullable: false),
                    PolicyNumber = table.Column<string>(type: "text", nullable: false),
                    CommissionType = table.Column<string>(type: "text", nullable: false),
                    CommissionSubType = table.Column<string>(type: "text", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric", nullable: false),
                    MatchedSubmissionId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StatementItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StatementItems_CommissionStatements_CommissionStatementId",
                        column: x => x.CommissionStatementId,
                        principalTable: "CommissionStatements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StatementItems_Submissions_MatchedSubmissionId",
                        column: x => x.MatchedSubmissionId,
                        principalTable: "Submissions",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_StatementItems_CommissionStatementId",
                table: "StatementItems",
                column: "CommissionStatementId");

            migrationBuilder.CreateIndex(
                name: "IX_StatementItems_MatchedSubmissionId",
                table: "StatementItems",
                column: "MatchedSubmissionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StatementItems");

            migrationBuilder.DropTable(
                name: "CommissionStatements");

            migrationBuilder.DropColumn(
                name: "PolicyNumber",
                table: "Submissions");
        }
    }
}
