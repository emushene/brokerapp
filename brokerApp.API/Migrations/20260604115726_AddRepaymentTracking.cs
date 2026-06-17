using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace brokerApp.API.Migrations
{
    /// <inheritdoc />
    public partial class AddRepaymentTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AccountAdjustmentId",
                table: "AdvisorCommissions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TargetMonthlyRepayment",
                table: "AccountAdjustments",
                type: "numeric",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AdvisorCommissions_AccountAdjustmentId",
                table: "AdvisorCommissions",
                column: "AccountAdjustmentId");

            migrationBuilder.AddForeignKey(
                name: "FK_AdvisorCommissions_AccountAdjustments_AccountAdjustmentId",
                table: "AdvisorCommissions",
                column: "AccountAdjustmentId",
                principalTable: "AccountAdjustments",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AdvisorCommissions_AccountAdjustments_AccountAdjustmentId",
                table: "AdvisorCommissions");

            migrationBuilder.DropIndex(
                name: "IX_AdvisorCommissions_AccountAdjustmentId",
                table: "AdvisorCommissions");

            migrationBuilder.DropColumn(
                name: "AccountAdjustmentId",
                table: "AdvisorCommissions");

            migrationBuilder.DropColumn(
                name: "TargetMonthlyRepayment",
                table: "AccountAdjustments");
        }
    }
}
