using brokerApp.API.Data;
using brokerApp.API.Models;
using Microsoft.EntityFrameworkCore;

namespace brokerApp.API.Repositories;

public class SubmissionRepository : ISubmissionRepository
{
    private readonly ApplicationDbContext _context;

    public SubmissionRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Submission> AddAsync(Submission submission)
    {
        await _context.Submissions.AddAsync(submission);
        return submission;
    }

    public async Task<IEnumerable<Submission>> GetByAdvisorIdAsync(string advisorId)
    {
        return await _context.Submissions
            .Where(s => s.AdvisorId == advisorId)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}