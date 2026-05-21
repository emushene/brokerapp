using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace brokerApp.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAccountAdjustmentsAndPromotionalItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PromotionalItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Price = table.Column<decimal>(type: "numeric", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    Sizes = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PromotionalItems", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AccountAdjustments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TotalAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    RemainingBalance = table.Column<decimal>(type: "numeric", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    DateIncurred = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    AdvisorId = table.Column<int>(type: "integer", nullable: true),
                    AdvisorGroupId = table.Column<int>(type: "integer", nullable: true),
                    PromotionalItemId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccountAdjustments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AccountAdjustments_AdvisorGroups_AdvisorGroupId",
                        column: x => x.AdvisorGroupId,
                        principalTable: "AdvisorGroups",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_AccountAdjustments_Advisors_AdvisorId",
                        column: x => x.AdvisorId,
                        principalTable: "Advisors",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_AccountAdjustments_PromotionalItems_PromotionalItemId",
                        column: x => x.PromotionalItemId,
                        principalTable: "PromotionalItems",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_AccountAdjustments_AdvisorGroupId",
                table: "AccountAdjustments",
                column: "AdvisorGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_AccountAdjustments_AdvisorId",
                table: "AccountAdjustments",
                column: "AdvisorId");

            migrationBuilder.CreateIndex(
                name: "IX_AccountAdjustments_PromotionalItemId",
                table: "AccountAdjustments",
                column: "PromotionalItemId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AccountAdjustments");

            migrationBuilder.DropTable(
                name: "PromotionalItems");
        }
    }
}
