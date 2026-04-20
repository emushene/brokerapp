using Microsoft.EntityFrameworkCore;
using brokerApp.API.Models;

namespace brokerApp.API.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Submission> Submissions { get; set; }
}