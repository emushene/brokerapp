using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace brokerApp.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMovementItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MovementItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CommissionStatementId = table.Column<int>(type: "integer", nullable: false),
                    PolicyNumber = table.Column<string>(type: "text", nullable: false),
                    ClientName = table.Column<string>(type: "text", nullable: false),
                    MovementType = table.Column<string>(type: "text", nullable: false),
                    EffectiveDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Premium = table.Column<decimal>(type: "numeric", nullable: false),
                    MatchedSubmissionId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MovementItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MovementItems_CommissionStatements_CommissionStatementId",
                        column: x => x.CommissionStatementId,
                        principalTable: "CommissionStatements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MovementItems_Submissions_MatchedSubmissionId",
                        column: x => x.MatchedSubmissionId,
                        principalTable: "Submissions",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_MovementItems_CommissionStatementId",
                table: "MovementItems",
                column: "CommissionStatementId");

            migrationBuilder.CreateIndex(
                name: "IX_MovementItems_MatchedSubmissionId",
                table: "MovementItems",
                column: "MatchedSubmissionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MovementItems");
        }
    }
}
