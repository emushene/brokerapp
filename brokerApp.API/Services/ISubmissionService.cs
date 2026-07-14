using brokerApp.API.DTOs;

namespace brokerApp.API.Services;

public interface ISubmissionService
{
    Task<SubmissionResponseDto> CreateSubmissionAsync(SubmissionCreateDto dto);
    Task<(IEnumerable<SubmissionResponseDto> Items, int TotalCount)> GetAdvisorSubmissionsAsync(int page = 1, int pageSize = 1000);
    Task<(IEnumerable<SubmissionResponseDto> Items, int TotalCount)> GetAllSubmissionsAsync(int page = 1, int pageSize = 1000);
    Task<(IEnumerable<SubmissionResponseDto> Items, int TotalCount)> GetSubmissionsByAdvisorIdAsync(int advisorId, int page = 1, int pageSize = 1000);
    Task<SubmissionResponseDto> UploadDocumentAsync(int submissionId, IFormFile file);
    Task<(IEnumerable<SubmissionResponseDto> Items, int TotalCount)> SearchSubmissionsAsync(string query, int page = 1, int pageSize = 1000);
}