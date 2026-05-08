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
    private readonly IFileStorageService _fileStorageService;
    private readonly IConfiguration _configuration;

    public SubmissionService(
        ISubmissionRepository repository,
        IMapper mapper,
        IHttpContextAccessor httpContextAccessor,
        IFileStorageService fileStorageService,
        IConfiguration configuration)
    {
        _repository = repository;
        _mapper = mapper;
        _httpContextAccessor = httpContextAccessor;
        _fileStorageService = fileStorageService;
        _configuration = configuration;
    }

    private string GetFirebaseUserId()
    {
        var userId = _httpContextAccessor.HttpContext?.User.FindFirst("user_id")?.Value;
        if (string.IsNullOrEmpty(userId))
            throw new UnauthorizedAccessException("Firebase User ID not found in token.");
        
        return userId;
    }

    private string GetFolderName(IEnumerable<Advisor> advisors)
    {
        if (advisors == null || !advisors.Any())
            return "Unassigned";

        var names = advisors
            .OrderBy(a => a.Name)
            .Select(a => a.Name.Replace(" ", "_"));
            
        return string.Join("-", names);
    }

    public async Task<SubmissionResponseDto> CreateSubmissionAsync(SubmissionCreateDto dto)
    {
        var submission = _mapper.Map<Submission>(dto);
        
        // Ensure Date is Utc to satisfy PostgreSQL requirement
        submission.Date = DateTime.SpecifyKind(submission.Date, DateTimeKind.Utc);
        submission.CreatedAt = DateTime.UtcNow;

        var firebaseUserId = GetFirebaseUserId();
        
        // Get advisors from provided IDs
        var advisors = await _repository.GetAdvisorsByIdsAsync(dto.AdvisorIds);
        submission.Advisors = advisors.ToList();

        // Ensure the logged-in advisor is also linked
        var currentAdvisor = await _repository.GetAdvisorByFirebaseIdAsync(firebaseUserId);
        if (currentAdvisor != null && !submission.Advisors.Any(a => a.FirebaseId == firebaseUserId))
        {
            submission.Advisors.Add(currentAdvisor);
        }

        await _repository.AddAsync(submission);
        await _repository.SaveChangesAsync();

        // Handle File Upload if present
        if (dto.ApplicationForm != null)
        {
            var folderName = GetFolderName(submission.Advisors);
            var fileName = $"{submission.IdNumber}_{submission.ApplicantSurname}_{DateTime.UtcNow:yyyyMMddHHmmss}{Path.GetExtension(dto.ApplicationForm.FileName)}";
            
            using var stream = dto.ApplicationForm.OpenReadStream();
            var storageKey = await _fileStorageService.UploadFileAsync(stream, fileName, dto.ApplicationForm.ContentType, folderName);
            
            var fileUrl = await _fileStorageService.GetFileUrlAsync(storageKey);
            
            submission.Documents.Add(new SubmissionDocument
            {
                StorageKey = storageKey,
                FileName = fileName,
                FileUrl = fileUrl,
                DateModified = DateTime.UtcNow
            });

            await _repository.SaveChangesAsync();
        }

        return _mapper.Map<SubmissionResponseDto>(submission);
    }

    public async Task<IEnumerable<SubmissionResponseDto>> GetAdvisorSubmissionsAsync()
    {
        var advisorId = GetFirebaseUserId();
        var submissions = await _repository.GetByAdvisorIdAsync(advisorId);
        
        return _mapper.Map<IEnumerable<SubmissionResponseDto>>(submissions);
    }

    public async Task<IEnumerable<SubmissionResponseDto>> GetAllSubmissionsAsync()
    {
        var submissions = await _repository.GetAllAsync();
        return _mapper.Map<IEnumerable<SubmissionResponseDto>>(submissions);
    }

    public async Task<IEnumerable<SubmissionResponseDto>> GetSubmissionsByAdvisorIdAsync(int advisorId)
    {
        var submissions = await _repository.GetByInternalAdvisorIdAsync(advisorId);
        return _mapper.Map<IEnumerable<SubmissionResponseDto>>(submissions);
    }

    public async Task<SubmissionResponseDto> UploadDocumentAsync(int submissionId, IFormFile file)
    {
        var target = await _repository.GetByIdAsync(submissionId);
        
        if (target == null) throw new Exception("Submission not found");

        var folderName = GetFolderName(target.Advisors);
        var fileName = $"{target.IdNumber}_{target.ApplicantSurname}_{DateTime.UtcNow:yyyyMMddHHmmss}{Path.GetExtension(file.FileName)}";
        
        using var stream = file.OpenReadStream();
        var storageKey = await _fileStorageService.UploadFileAsync(stream, fileName, file.ContentType, folderName);
        
        var fileUrl = await _fileStorageService.GetFileUrlAsync(storageKey);
        
        target.Documents.Add(new SubmissionDocument
        {
            StorageKey = storageKey,
            FileName = fileName,
            FileUrl = fileUrl,
            DateModified = DateTime.UtcNow
        });

        await _repository.SaveChangesAsync();

        return _mapper.Map<SubmissionResponseDto>(target);
    }
}