using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace brokerApp.API.Migrations
{
    /// <inheritdoc />
    public partial class UpdateSubmissionSchemaV2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ProductType",
                table: "Submissions",
                newName: "SalaryRefNo");

            migrationBuilder.RenameColumn(
                name: "GovernmentId",
                table: "Submissions",
                newName: "IntermediaryName");

            migrationBuilder.RenameColumn(
                name: "FullName",
                table: "Submissions",
                newName: "IntermediaryCode");

            migrationBuilder.AddColumn<string>(
                name: "ApplicantPhoneNumber",
                table: "Submissions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ApplicantSurname",
                table: "Submissions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "Date",
                table: "Submissions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "IdNumber",
                table: "Submissions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Initials",
                table: "Submissions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "Premium",
                table: "Submissions",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApplicantPhoneNumber",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "ApplicantSurname",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "Date",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "IdNumber",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "Initials",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "Premium",
                table: "Submissions");

            migrationBuilder.RenameColumn(
                name: "SalaryRefNo",
                table: "Submissions",
                newName: "ProductType");

            migrationBuilder.RenameColumn(
                name: "IntermediaryName",
                table: "Submissions",
                newName: "GovernmentId");

            migrationBuilder.RenameColumn(
                name: "IntermediaryCode",
                table: "Submissions",
                newName: "FullName");
        }
    }
}
