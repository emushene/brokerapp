using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace brokerApp.API.Migrations
{
    /// <inheritdoc />
    public partial class AddDetailedCommissionBreakdownFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CaptureDate",
                table: "StatementItems",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CommissionRetention",
                table: "StatementItems",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "GrossCommission",
                table: "StatementItems",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "NettCommission",
                table: "StatementItems",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Product",
                table: "StatementItems",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CaptureDate",
                table: "AdvisorCommissions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ClawBackGross",
                table: "AdvisorCommissions",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "ClawBackReason",
                table: "AdvisorCommissions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ClawBackRetention",
                table: "AdvisorCommissions",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CommissionRetention",
                table: "AdvisorCommissions",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "GrossCommission",
                table: "AdvisorCommissions",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "NettCommission",
                table: "AdvisorCommissions",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "Product",
                table: "AdvisorCommissions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "SplitPercentage",
                table: "AdvisorCommissions",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CaptureDate",
                table: "StatementItems");

            migrationBuilder.DropColumn(
                name: "CommissionRetention",
                table: "StatementItems");

            migrationBuilder.DropColumn(
                name: "GrossCommission",
                table: "StatementItems");

            migrationBuilder.DropColumn(
                name: "NettCommission",
                table: "StatementItems");

            migrationBuilder.DropColumn(
                name: "Product",
                table: "StatementItems");

            migrationBuilder.DropColumn(
                name: "CaptureDate",
                table: "AdvisorCommissions");

            migrationBuilder.DropColumn(
                name: "ClawBackGross",
                table: "AdvisorCommissions");

            migrationBuilder.DropColumn(
                name: "ClawBackReason",
                table: "AdvisorCommissions");

            migrationBuilder.DropColumn(
                name: "ClawBackRetention",
                table: "AdvisorCommissions");

            migrationBuilder.DropColumn(
                name: "CommissionRetention",
                table: "AdvisorCommissions");

            migrationBuilder.DropColumn(
                name: "GrossCommission",
                table: "AdvisorCommissions");

            migrationBuilder.DropColumn(
                name: "NettCommission",
                table: "AdvisorCommissions");

            migrationBuilder.DropColumn(
                name: "Product",
                table: "AdvisorCommissions");

            migrationBuilder.DropColumn(
                name: "SplitPercentage",
                table: "AdvisorCommissions");
        }
    }
}
