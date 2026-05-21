using brokerApp.API.DTOs;

namespace brokerApp.API.Services;

public interface ISubmissionService
{
    Task<SubmissionResponseDto> CreateSubmissionAsync(SubmissionCreateDto dto);
    Task<IEnumerable<SubmissionResponseDto>> GetAdvisorSubmissionsAsync(int page = 1, int pageSize = 50);
    Task<IEnumerable<SubmissionResponseDto>> GetAllSubmissionsAsync(int page = 1, int pageSize = 50);
    Task<IEnumerable<SubmissionResponseDto>> GetSubmissionsByAdvisorIdAsync(int advisorId, int page = 1, int pageSize = 50);
    Task<SubmissionResponseDto> UploadDocumentAsync(int submissionId, IFormFile file);
    Task<IEnumerable<SubmissionResponseDto>> SearchSubmissionsAsync(string query, int page = 1, int pageSize = 50);
}