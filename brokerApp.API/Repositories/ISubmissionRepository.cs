using brokerApp.API.Models;

namespace brokerApp.API.Repositories;

public interface ISubmissionRepository
{
    Task<Submission> AddAsync(Submission submission);
    Task<(IEnumerable<Submission> Items, int TotalCount)> GetAllAsync(int page = 1, int pageSize = 1000);
    Task<(IEnumerable<Submission> Items, int TotalCount)> GetByAdvisorIdAsync(string firebaseId, int page = 1, int pageSize = 1000);
    Task<(IEnumerable<Submission> Items, int TotalCount)> GetByInternalAdvisorIdAsync(int advisorId, int page = 1, int pageSize = 1000);
    Task<IEnumerable<Advisor>> GetAdvisorsByIdsAsync(IEnumerable<int> ids);
    Task<AdvisorGroup?> GetAdvisorGroupByIdAsync(int id);
    Task<Advisor?> GetAdvisorByFirebaseIdAsync(string firebaseId);
    Task<Submission?> GetByIdAsync(int id);
    Task<(IEnumerable<Submission> Items, int TotalCount)> SearchAsync(string query, int page = 1, int pageSize = 1000);
    Task SaveChangesAsync();
}