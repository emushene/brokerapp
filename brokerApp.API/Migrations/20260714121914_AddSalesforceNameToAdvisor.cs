using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace brokerApp.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSalesforceNameToAdvisor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SalesforceName",
                table: "Advisors",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SalesforceName",
                table: "Advisors");
        }
    }
}
