using brokerApp.API.Data;
using brokerApp.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace brokerApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SyncController : ControllerBase
{
    private readonly IGoogleDriveSyncService _syncService;
    private readonly ApplicationDbContext _dbContext;

    public SyncController(IGoogleDriveSyncService syncService, ApplicationDbContext dbContext)
    {
        _syncService = syncService;
        _dbContext = dbContext;
    }

    [HttpPost("trigger")]
    public async Task<IActionResult> TriggerSync()
    {
        // Fire and forget so the API doesn't timeout if there are many files
        _ = _syncService.SyncAllAsync();
        
        return Ok(new { message = "Synchronization triggered in the background." });
    }

    [HttpGet("status")]
    public async Task<IActionResult> GetSyncStatus()
    {
        var submissionCount = _dbContext.Submissions.Count();
        var documentCount = _dbContext.SubmissionDocuments.Count();
        var advisorCount = _dbContext.Advisors.Count();

        return Ok(new 
        { 
            totalSubmissions = submissionCount,
            totalDocuments = documentCount,
            totalAdvisors = advisorCount
        });
    }
}
