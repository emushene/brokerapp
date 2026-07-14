using AutoMapper;
using brokerApp.API.DTOs;
using brokerApp.API.Models;
using brokerApp.API.Repositories;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Primitives;
using System.Security.Claims;

namespace brokerApp.API.Services;

public class SubmissionService : ISubmissionService
{
    private readonly ISubmissionRepository _repository;
    private readonly IMapper _mapper;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IFileStorageService _fileStorageService;
    private readonly IConfiguration _configuration;
    private readonly IMemoryCache _cache;
    private readonly string _cacheKeyPrefix = "Submissions_";
    private static CancellationTokenSource _resetCacheToken = new CancellationTokenSource();

    public SubmissionService(
        ISubmissionRepository repository,
        IMapper mapper,
        IHttpContextAccessor httpContextAccessor,
        IFileStorageService fileStorageService,
        IConfiguration configuration,
        IMemoryCache cache)
    {
        _repository = repository;
        _mapper = mapper;
        _httpContextAccessor = httpContextAccessor;
        _fileStorageService = fileStorageService;
        _configuration = configuration;
        _cache = cache;
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

    private void InvalidateCache()
    {
        if (!_resetCacheToken.IsCancellationRequested && _resetCacheToken.Token.CanBeCanceled)
        {
            _resetCacheToken.Cancel();
            _resetCacheToken.Dispose();
        }
        _resetCacheToken = new CancellationTokenSource();
    }

    public async Task<SubmissionResponseDto> CreateSubmissionAsync(SubmissionCreateDto dto)
    {
        var submission = _mapper.Map<Submission>(dto);
        
        // Ensure Date is Utc to satisfy PostgreSQL requirement
        submission.Date = DateTime.SpecifyKind(submission.Date, DateTimeKind.Utc);
        submission.CreatedAt = DateTime.UtcNow;

        var firebaseUserId = GetFirebaseUserId();
        
        // Get advisors from provided IDs or Group
        if (dto.AdvisorGroupId.HasValue)
        {
            var group = await _repository.GetAdvisorGroupByIdAsync(dto.AdvisorGroupId.Value);
            if (group != null)
            {
                submission.AdvisorGroupId = group.Id;
                submission.Advisors = group.Members.ToList();
            }
        }
        else if (dto.AdvisorIds != null && dto.AdvisorIds.Any())
        {
            var advisors = await _repository.GetAdvisorsByIdsAsync(dto.AdvisorIds);
            submission.Advisors = advisors.ToList();
        }

        // Ensure the logged-in advisor is also linked if they're not already (for individual tracking)
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

        InvalidateCache();
        return _mapper.Map<SubmissionResponseDto>(submission);
    }

    public async Task<(IEnumerable<SubmissionResponseDto> Items, int TotalCount)> GetAdvisorSubmissionsAsync(int page = 1, int pageSize = 1000)
    {
        var advisorId = GetFirebaseUserId();
        var cacheKey = $"{_cacheKeyPrefix}Advisor_{advisorId}_{page}_{pageSize}";

        if (!_cache.TryGetValue(cacheKey, out (IEnumerable<SubmissionResponseDto> Items, int TotalCount) result))
        {
            var (submissions, totalCount) = await _repository.GetByAdvisorIdAsync(advisorId, page, pageSize);
            var mapped = _mapper.Map<IEnumerable<SubmissionResponseDto>>(submissions);
            result = (mapped, totalCount);

            var cacheOptions = new MemoryCacheEntryOptions()
                .SetSlidingExpiration(TimeSpan.FromMinutes(5))
                .SetAbsoluteExpiration(TimeSpan.FromHours(1))
                .AddExpirationToken(new CancellationChangeToken(_resetCacheToken.Token));

            _cache.Set(cacheKey, result, cacheOptions);
        }
        
        return result;
    }

    public async Task<(IEnumerable<SubmissionResponseDto> Items, int TotalCount)> GetAllSubmissionsAsync(int page = 1, int pageSize = 1000)
    {
        var cacheKey = $"{_cacheKeyPrefix}All_{page}_{pageSize}";

        if (!_cache.TryGetValue(cacheKey, out (IEnumerable<SubmissionResponseDto> Items, int TotalCount) result))
        {
            var (submissions, totalCount) = await _repository.GetAllAsync(page, pageSize);
            var mapped = _mapper.Map<IEnumerable<SubmissionResponseDto>>(submissions);
            result = (mapped, totalCount);

            var cacheOptions = new MemoryCacheEntryOptions()
                .SetSlidingExpiration(TimeSpan.FromMinutes(5))
                .SetAbsoluteExpiration(TimeSpan.FromHours(1))
                .AddExpirationToken(new CancellationChangeToken(_resetCacheToken.Token));

            _cache.Set(cacheKey, result, cacheOptions);
        }

        return result;
    }

    public async Task<(IEnumerable<SubmissionResponseDto> Items, int TotalCount)> GetSubmissionsByAdvisorIdAsync(int advisorId, int page = 1, int pageSize = 1000)
    {
        var cacheKey = $"{_cacheKeyPrefix}InternalAdvisor_{advisorId}_{page}_{pageSize}";

        if (!_cache.TryGetValue(cacheKey, out (IEnumerable<SubmissionResponseDto> Items, int TotalCount) result))
        {
            var (submissions, totalCount) = await _repository.GetByInternalAdvisorIdAsync(advisorId, page, pageSize);
            var mapped = _mapper.Map<IEnumerable<SubmissionResponseDto>>(submissions);
            result = (mapped, totalCount);

            var cacheOptions = new MemoryCacheEntryOptions()
                .SetSlidingExpiration(TimeSpan.FromMinutes(5))
                .SetAbsoluteExpiration(TimeSpan.FromHours(1))
                .AddExpirationToken(new CancellationChangeToken(_resetCacheToken.Token));

            _cache.Set(cacheKey, result, cacheOptions);
        }

        return result;
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
        InvalidateCache();

        return _mapper.Map<SubmissionResponseDto>(target);
    }

    public async Task<(IEnumerable<SubmissionResponseDto> Items, int TotalCount)> SearchSubmissionsAsync(string query, int page = 1, int pageSize = 1000)
    {
        var cacheKey = $"{_cacheKeyPrefix}Search_{query}_{page}_{pageSize}";

        if (!_cache.TryGetValue(cacheKey, out (IEnumerable<SubmissionResponseDto> Items, int TotalCount) result))
        {
            var (submissions, totalCount) = await _repository.SearchAsync(query, page, pageSize);
            var mapped = _mapper.Map<IEnumerable<SubmissionResponseDto>>(submissions);
            result = (mapped, totalCount);

            var cacheOptions = new MemoryCacheEntryOptions()
                .SetSlidingExpiration(TimeSpan.FromMinutes(2)) // Shorter expiration for searches
                .SetAbsoluteExpiration(TimeSpan.FromMinutes(10))
                .AddExpirationToken(new CancellationChangeToken(_resetCacheToken.Token));

            _cache.Set(cacheKey, result, cacheOptions);
        }

        return result;
    }
}