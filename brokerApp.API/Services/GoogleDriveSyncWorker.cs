using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace brokerApp.API.Services;

public class GoogleDriveSyncWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<GoogleDriveSyncWorker> _logger;
    private readonly TimeSpan _interval = TimeSpan.FromHours(6); // 4 times a day

    public GoogleDriveSyncWorker(IServiceProvider serviceProvider, ILogger<GoogleDriveSyncWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Google Drive Sync Worker is starting.");

        // Initial delay to allow the app to warm up
        await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using (var scope = _serviceProvider.CreateScope())
                {
                    var syncService = scope.ServiceProvider.GetRequiredService<IGoogleDriveSyncService>();
                    await syncService.SyncAllAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while running the Google Drive sync.");
            }

            _logger.LogInformation("Sync Worker sleeping for {Interval}...", _interval);
            await Task.Delay(_interval, stoppingToken);
        }
    }
}
