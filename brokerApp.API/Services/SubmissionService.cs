using AutoMapper;
using brokerApp.API.DTOs;
using brokerApp.API.Models;
using brokerApp.API.Repositories;
using System.Security.Claims;

namespace brokerApp.API.Services;

public class SubmissionService : ISubmissionService
{
    private readonly ISubmissionRepository _repository;
    private readonly IMapper _mapper;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public SubmissionService(
        ISubmissionRepository repository,
        IMapper mapper,
        IHttpContextAccessor httpContextAccessor)
    {
        _repository = repository;
        _mapper = mapper;
        _httpContextAccessor = httpContextAccessor;
    }

    private string GetFirebaseUserId()
    {
        var userId = _httpContextAccessor.HttpContext?.User.FindFirst("user_id")?.Value;
        if (string.IsNullOrEmpty(userId))
            throw new UnauthorizedAccessException("Firebase User ID not found in token.");
        
        return userId;
    }

    public async Task<SubmissionResponseDto> CreateSubmissionAsync(SubmissionCreateDto dto)
    {
        var submission = _mapper.Map<Submission>(dto);
        
        submission.AdvisorId = GetFirebaseUserId();
        submission.CreatedAt = DateTime.UtcNow;

        await _repository.AddAsync(submission);
        await _repository.SaveChangesAsync();

        return _mapper.Map<SubmissionResponseDto>(submission);
    }

    public async Task<IEnumerable<SubmissionResponseDto>> GetAdvisorSubmissionsAsync()
    {
        var advisorId = GetFirebaseUserId();
        var submissions = await _repository.GetByAdvisorIdAsync(advisorId);
        
        return _mapper.Map<IEnumerable<SubmissionResponseDto>>(submissions);
    }
}