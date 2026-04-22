using brokerApp.API.DTOs;

namespace brokerApp.API.Services;

public interface ISubmissionService
{
    Task<SubmissionResponseDto> CreateSubmissionAsync(SubmissionCreateDto dto);
    Task<IEnumerable<SubmissionResponseDto>> GetAdvisorSubmissionsAsync();
    Task<IEnumerable<SubmissionResponseDto>> GetAllSubmissionsAsync();
}