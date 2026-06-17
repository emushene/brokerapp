using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace brokerApp.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAdvisorEmailAndPayslipStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "EmailSentDate",
                table: "CommissionStatements",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "CommissionStatements",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Advisors",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "CommissionStatementId",
                table: "AdvisorCommissions",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AdvisorCommissions_CommissionStatementId",
                table: "AdvisorCommissions",
                column: "CommissionStatementId");

            migrationBuilder.AddForeignKey(
                name: "FK_AdvisorCommissions_CommissionStatements_CommissionStatement~",
                table: "AdvisorCommissions",
                column: "CommissionStatementId",
                principalTable: "CommissionStatements",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AdvisorCommissions_CommissionStatements_CommissionStatement~",
                table: "AdvisorCommissions");

            migrationBuilder.DropIndex(
                name: "IX_AdvisorCommissions_CommissionStatementId",
                table: "AdvisorCommissions");

            migrationBuilder.DropColumn(
                name: "EmailSentDate",
                table: "CommissionStatements");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "CommissionStatements");

            migrationBuilder.DropColumn(
                name: "Email",
                table: "Advisors");

            migrationBuilder.DropColumn(
                name: "CommissionStatementId",
                table: "AdvisorCommissions");
        }
    }
}
