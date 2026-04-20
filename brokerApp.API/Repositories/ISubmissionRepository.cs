using brokerApp.API.Models;

namespace brokerApp.API.Repositories;

public interface ISubmissionRepository
{
    Task<Submission> AddAsync(Submission submission);
    Task<IEnumerable<Submission>> GetByAdvisorIdAsync(string advisorId);
    Task SaveChangesAsync();
}