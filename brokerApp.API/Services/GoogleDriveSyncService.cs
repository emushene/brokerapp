using System.Text.RegularExpressions;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Drive.v3;
using Google.Apis.Services;
using Microsoft.EntityFrameworkCore;
using brokerApp.API.Data;
using brokerApp.API.Models;

namespace brokerApp.API.Services;

public interface IGoogleDriveSyncService
{
    Task SyncAllAsync();
}

public class GoogleDriveSyncService : IGoogleDriveSyncService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GoogleDriveSyncService> _logger;

    public GoogleDriveSyncService(
        IServiceProvider serviceProvider,
        IConfiguration configuration,
        ILogger<GoogleDriveSyncService> logger)
    {
        _serviceProvider = serviceProvider;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SyncAllAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var keyFilePath = _configuration["GoogleDrive:KeyFilePath"] ?? "broker-app-key.json";
        var rootFolderId = _configuration["GoogleDrive:RootFolderId"] ?? "";

        if (string.IsNullOrEmpty(rootFolderId))
        {
            _logger.LogWarning("GoogleDrive:RootFolderId is not configured. Skipping sync.");
            return;
        }

        try
        {
            _logger.LogInformation("Starting Google Drive synchronization...");
            
            GoogleCredential credential;
            using (var stream = new FileStream(keyFilePath, FileMode.Open, FileAccess.Read))
            {
                credential = GoogleCredential.FromStream(stream)
                    .CreateScoped(DriveService.Scope.DriveMetadataReadonly);
            }

            var service = new DriveService(new BaseClientService.Initializer()
            {
                HttpClientInitializer = credential,
                ApplicationName = "BrokerAppSyncTool",
            });

            var allAdvisors = await dbContext.Advisors.ToListAsync();

            var folderListRequest = service.Files.List();
            folderListRequest.Q = $"'{rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
            folderListRequest.SupportsAllDrives = true;
            folderListRequest.IncludeItemsFromAllDrives = true;
            folderListRequest.Fields = "files(id, name)";
            
            var foldersResult = await folderListRequest.ExecuteAsync();

            foreach (var folder in foldersResult.Files)
            {
                if (folder.Name.StartsWith("Test_Connection_")) continue;

                var advisor = allAdvisors.FirstOrDefault(a => a.Name.Equals(folder.Name, StringComparison.OrdinalIgnoreCase));
                
                if (advisor == null)
                {
                    _logger.LogInformation("Advisor '{FolderName}' not found. Creating...", folder.Name);
                    advisor = new Advisor 
                    { 
                        Name = folder.Name, 
                        Code = "AUTO", 
                        FirebaseId = "imported_" + folder.Name.Replace(" ", "_") 
                    };
                    dbContext.Advisors.Add(advisor);
                    await dbContext.SaveChangesAsync();
                    allAdvisors.Add(advisor);
                }

                var fileListRequest = service.Files.List();
                fileListRequest.Q = $"'{folder.Id}' in parents and mimeType = 'application/pdf' and trashed = false";
                fileListRequest.SupportsAllDrives = true;
                fileListRequest.IncludeItemsFromAllDrives = true;
                fileListRequest.Fields = "files(id, name, webViewLink, modifiedTime)";
                
                var filesResult = await fileListRequest.ExecuteAsync();

                foreach (var file in filesResult.Files)
                {
                    var (idNum, surname, initial) = ParseFileName(file.Name);
                    
                    if (string.IsNullOrEmpty(idNum)) continue;

                    var existingSubmission = await dbContext.Submissions
                        .Include(s => s.Advisors)
                        .Include(s => s.Documents)
                        .FirstOrDefaultAsync(s => s.IdNumber == idNum && s.Advisors.Any(a => a.Id == advisor.Id));

                    if (existingSubmission == null)
                    {
                        _logger.LogInformation("Creating new submission for {IdNum} under {Advisor}", idNum, advisor.Name);
                        var newSubmission = new Submission
                        {
                            IdNumber = idNum,
                            ApplicantSurname = surname,
                            Initials = initial,
                            Date = (file.ModifiedTimeDateTimeOffset?.UtcDateTime ?? DateTime.UtcNow).ToUniversalTime(),
                            CreatedAt = DateTime.UtcNow,
                            Status = SubmissionStatus.Submitted,
                            Type = SubmissionType.Individual,
                            Advisors = new List<Advisor> { advisor }
                        };

                        newSubmission.Documents.Add(new SubmissionDocument
                        {
                            FileName = file.Name,
                            StorageKey = file.Id,
                            FileUrl = file.WebViewLink,
                            DateModified = (file.ModifiedTimeDateTimeOffset?.UtcDateTime ?? DateTime.UtcNow).ToUniversalTime()
                        });

                        dbContext.Submissions.Add(newSubmission);
                    }
                    else if (!existingSubmission.Documents.Any(d => d.StorageKey == file.Id))
                    {
                        _logger.LogInformation("Updating existing submission {IdNum} with new document", idNum);
                        existingSubmission.Documents.Add(new SubmissionDocument
                        {
                            FileName = file.Name,
                            StorageKey = file.Id,
                            FileUrl = file.WebViewLink,
                            DateModified = (file.ModifiedTimeDateTimeOffset?.UtcDateTime ?? DateTime.UtcNow).ToUniversalTime()
                        });
                    }
                }
                await dbContext.SaveChangesAsync();
            }

            _logger.LogInformation("Google Drive synchronization completed.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during Google Drive synchronization");
        }
    }

    private (string idNum, string surname, string initial) ParseFileName(string fileName)
    {
        var cleanName = fileName.Replace(".pdf", "", StringComparison.OrdinalIgnoreCase).Trim();
        var match = Regex.Match(cleanName, @"^(\d{10,15})\s+([A-Z0-9\-\']+)(?:\s+([A-Z\s\.]+))?$", RegexOptions.IgnoreCase);
        
        if (match.Success)
        {
            return (match.Groups[1].Value, match.Groups[2].Value, match.Groups[3].Success ? match.Groups[3].Value.Trim() : "");
        }

        var parts = cleanName.Split(new[] { ' ', '_', '-' }, StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length >= 2 && parts[0].Length >= 6 && parts[0].Any(char.IsDigit))
        {
            return (parts[0], parts[1], parts.Length > 2 ? string.Join(" ", parts.Skip(2)) : "");
        }

        return ("", "", "");
    }
}
