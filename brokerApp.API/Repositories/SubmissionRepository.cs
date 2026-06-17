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

    public async Task<IEnumerable<Submission>> GetAllAsync(int page = 1, int pageSize = 50)
    {
        return await _context.Submissions
            .Include(s => s.Advisors)
            .Include(s => s.AdvisorGroup)
            .Include(s => s.Documents)
            .OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<IEnumerable<Submission>> GetByAdvisorIdAsync(string firebaseId, int page = 1, int pageSize = 50)
    {
        return await _context.Submissions
            .Include(s => s.Advisors)
            .Include(s => s.AdvisorGroup)
            .Include(s => s.Documents)
            .Where(s => s.Advisors.Any(a => a.FirebaseId == firebaseId))
            .OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<IEnumerable<Submission>> GetByInternalAdvisorIdAsync(int advisorId, int page = 1, int pageSize = 50)
    {
        return await _context.Submissions
            .Include(s => s.Advisors)
            .Include(s => s.AdvisorGroup)
            .Include(s => s.Documents)
            .Where(s => s.Advisors.Any(a => a.Id == advisorId))
            .OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<IEnumerable<Advisor>> GetAdvisorsByIdsAsync(IEnumerable<int> ids)
    {
        return await _context.Advisors
            .Where(a => ids.Contains(a.Id))
            .ToListAsync();
    }

    public async Task<AdvisorGroup?> GetAdvisorGroupByIdAsync(int id)
    {
        return await _context.AdvisorGroups
            .Include(g => g.Members)
            .FirstOrDefaultAsync(g => g.Id == id);
    }

    public async Task<Advisor?> GetAdvisorByFirebaseIdAsync(string firebaseId)
    {
        return await _context.Advisors
            .FirstOrDefaultAsync(a => a.FirebaseId == firebaseId);
    }

    public async Task<Submission?> GetByIdAsync(int id)
    {
        return await _context.Submissions
            .Include(s => s.Advisors)
            .Include(s => s.AdvisorGroup)
            .Include(s => s.Documents)
            .FirstOrDefaultAsync(s => s.Id == id);
    }

    public async Task<IEnumerable<Submission>> SearchAsync(string query, int page = 1, int pageSize = 50)
    {
        if (string.IsNullOrWhiteSpace(query)) return await GetAllAsync(page, pageSize);
        
        var q = $"%{query}%";
        // Create a version of the query without spaces/dots for initials comparison
        var strippedQuery = $"%{query.Replace(".", "").Replace(" ", "")}%";

        return await _context.Submissions
            .Include(s => s.Advisors)
            .Include(s => s.AdvisorGroup)
            .Include(s => s.Documents)
            .Where(s => EF.Functions.ILike(s.PolicyNumber, q) || 
                        EF.Functions.ILike(s.ApplicantSurname, q) || 
                        EF.Functions.ILike(s.IdNumber, q) ||
                        EF.Functions.ILike(s.Initials, q) ||
                        EF.Functions.ILike(s.Initials.Replace(".", "").Replace(" ", ""), strippedQuery))
            .OrderByDescending(s => s.ApplicantSurname.ToLower() == query.ToLower() || s.PolicyNumber.ToLower() == query.ToLower() || s.IdNumber == query)
            .ThenByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}