using brokerApp.API.Models;

namespace brokerApp.API.Repositories;

public interface ISubmissionRepository
{
    Task<Submission> AddAsync(Submission submission);
    Task<IEnumerable<Submission>> GetAllAsync(int page = 1, int pageSize = 50);
    Task<IEnumerable<Submission>> GetByAdvisorIdAsync(string firebaseId, int page = 1, int pageSize = 50);
    Task<IEnumerable<Submission>> GetByInternalAdvisorIdAsync(int advisorId, int page = 1, int pageSize = 50);
    Task<IEnumerable<Advisor>> GetAdvisorsByIdsAsync(IEnumerable<int> ids);
    Task<AdvisorGroup?> GetAdvisorGroupByIdAsync(int id);
    Task<Advisor?> GetAdvisorByFirebaseIdAsync(string firebaseId);
    Task<Submission?> GetByIdAsync(int id);
    Task<IEnumerable<Submission>> SearchAsync(string query, int page = 1, int pageSize = 50);
    Task SaveChangesAsync();
}