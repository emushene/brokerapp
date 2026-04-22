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

    public async Task<IEnumerable<Submission>> GetAllAsync()
    {
        return await _context.Submissions
            .Include(s => s.Advisors)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Submission>> GetByAdvisorIdAsync(string firebaseId)
    {
        return await _context.Submissions
            .Include(s => s.Advisors)
            .Where(s => s.Advisors.Any(a => a.FirebaseId == firebaseId))
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Advisor>> GetAdvisorsByIdsAsync(IEnumerable<int> ids)
    {
        return await _context.Advisors
            .Where(a => ids.Contains(a.Id))
            .ToListAsync();
    }

    public async Task<Advisor?> GetAdvisorByFirebaseIdAsync(string firebaseId)
    {
        return await _context.Advisors
            .FirstOrDefaultAsync(a => a.FirebaseId == firebaseId);
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}