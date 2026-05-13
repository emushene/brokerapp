using brokerApp.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace brokerApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SyncController : ControllerBase
{
    private readonly IGoogleDriveSyncService _syncService;

    public SyncController(IGoogleDriveSyncService syncService)
    {
        _syncService = syncService;
    }

    [HttpPost("trigger")]
    public async Task<IActionResult> TriggerSync()
    {
        // Fire and forget so the API doesn't timeout if there are many files
        _ = _syncService.SyncAllAsync();
        
        return Ok(new { message = "Synchronization triggered in the background." });
    }
}
