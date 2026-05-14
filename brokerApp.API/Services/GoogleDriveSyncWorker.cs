using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;

namespace brokerApp.API.Services;

public class GoogleDriveSyncWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<GoogleDriveSyncWorker> _logger;
    private readonly IConfiguration _configuration;

    public GoogleDriveSyncWorker(IServiceProvider serviceProvider, ILogger<GoogleDriveSyncWorker> logger, IConfiguration configuration)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Google Drive Sync Worker is starting.");

        // Initial delay to allow the app to warm up
        await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            var intervalMinutes = _configuration.GetValue<int>("GoogleDrive:SyncIntervalMinutes", 30);
            var interval = TimeSpan.FromMinutes(intervalMinutes);

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

            _logger.LogInformation("Sync Worker sleeping for {Interval}...", interval);
            await Task.Delay(interval, stoppingToken);
        }
    }
}
