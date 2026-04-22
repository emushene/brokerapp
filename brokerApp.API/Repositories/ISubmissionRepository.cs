using brokerApp.API.Models;

namespace brokerApp.API.Repositories;

public interface ISubmissionRepository
{
    Task<Submission> AddAsync(Submission submission);
    Task<IEnumerable<Submission>> GetAllAsync();
    Task<IEnumerable<Submission>> GetByAdvisorIdAsync(string firebaseId);
    Task<IEnumerable<Advisor>> GetAdvisorsByIdsAsync(IEnumerable<int> ids);
    Task<Advisor?> GetAdvisorByFirebaseIdAsync(string firebaseId);
    Task SaveChangesAsync();
}