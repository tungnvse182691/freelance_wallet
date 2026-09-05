using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class BackfillNullAccountTransactions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                UPDATE ""Transactions"" SET ""AccountId"" = (
                    SELECT ""Id"" FROM ""Accounts"" ORDER BY ""CreatedAt"" LIMIT 1
                ) WHERE ""AccountId"" IS NULL
                  AND EXISTS (SELECT 1 FROM ""Accounts"");");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
