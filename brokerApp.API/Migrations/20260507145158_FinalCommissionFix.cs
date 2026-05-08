using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace brokerApp.API.Migrations
{
    /// <inheritdoc />
    public partial class FinalCommissionFix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AdvisorCommissions_PolicyPayments_PolicyPaymentId",
                table: "AdvisorCommissions");

            migrationBuilder.AlterColumn<int>(
                name: "PolicyPaymentId",
                table: "AdvisorCommissions",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<DateTime>(
                name: "DatePaid",
                table: "AdvisorCommissions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsPaid",
                table: "AdvisorCommissions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PayoutReference",
                table: "AdvisorCommissions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SubmissionId",
                table: "AdvisorCommissions",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AdvisorCommissions_SubmissionId",
                table: "AdvisorCommissions",
                column: "SubmissionId");

            migrationBuilder.AddForeignKey(
                name: "FK_AdvisorCommissions_PolicyPayments_PolicyPaymentId",
                table: "AdvisorCommissions",
                column: "PolicyPaymentId",
                principalTable: "PolicyPayments",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_AdvisorCommissions_Submissions_SubmissionId",
                table: "AdvisorCommissions",
                column: "SubmissionId",
                principalTable: "Submissions",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AdvisorCommissions_PolicyPayments_PolicyPaymentId",
                table: "AdvisorCommissions");

            migrationBuilder.DropForeignKey(
                name: "FK_AdvisorCommissions_Submissions_SubmissionId",
                table: "AdvisorCommissions");

            migrationBuilder.DropIndex(
                name: "IX_AdvisorCommissions_SubmissionId",
                table: "AdvisorCommissions");

            migrationBuilder.DropColumn(
                name: "DatePaid",
                table: "AdvisorCommissions");

            migrationBuilder.DropColumn(
                name: "IsPaid",
                table: "AdvisorCommissions");

            migrationBuilder.DropColumn(
                name: "PayoutReference",
                table: "AdvisorCommissions");

            migrationBuilder.DropColumn(
                name: "SubmissionId",
                table: "AdvisorCommissions");

            migrationBuilder.AlterColumn<int>(
                name: "PolicyPaymentId",
                table: "AdvisorCommissions",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_AdvisorCommissions_PolicyPayments_PolicyPaymentId",
                table: "AdvisorCommissions",
                column: "PolicyPaymentId",
                principalTable: "PolicyPayments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
