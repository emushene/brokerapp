using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace brokerApp.API.Migrations
{
    /// <inheritdoc />
    public partial class UpdateSecondYearCommissionTo45 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE \"Advisors\" SET \"CommissionPercentage2ndYear\" = 45.0 WHERE \"CommissionPercentage2ndYear\" = 70.0;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
