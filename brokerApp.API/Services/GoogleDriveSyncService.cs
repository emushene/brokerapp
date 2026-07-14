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

        var keyFilePath = _configuration["GoogleDrive:KeyFilePath"] ?? "joska-fin-key.json";
        var rootFolderIds = _configuration.GetSection("GoogleDrive:RootFolderIds").Get<string[]>();

        if (rootFolderIds == null || rootFolderIds.Length == 0)
        {
            _logger.LogWarning("GoogleDrive:RootFolderIds is not configured or empty. Skipping sync.");
            return;
        }

        try
        {
            _logger.LogInformation("Starting Google Drive synchronization for {Count} root folders...", rootFolderIds.Length);
            
            GoogleCredential credential;
            var serviceAccountJson = _configuration["GoogleDrive:ServiceAccountJson"];
            
            if (!string.IsNullOrEmpty(serviceAccountJson))
            {
                _logger.LogInformation("Google Drive Sync: Loading credentials from Secret Manager (JSON)");
                credential = GoogleCredential.FromJson(serviceAccountJson)
                    .CreateScoped(DriveService.Scope.DriveMetadataReadonly);
            }
            else
            {
                _logger.LogInformation("Google Drive Sync: Loading credentials from {Path}", keyFilePath);
                using (var stream = new FileStream(keyFilePath, FileMode.Open, FileAccess.Read))
                {
                    credential = GoogleCredential.FromStream(stream)
                        .CreateScoped(DriveService.Scope.DriveMetadataReadonly);
                }
            }

            var service = new DriveService(new BaseClientService.Initializer()
            {
                HttpClientInitializer = credential,
                ApplicationName = "BrokerAppSyncTool",
            });

            var allAdvisors = await dbContext.Advisors.ToListAsync();

            foreach (var rootFolderId in rootFolderIds)
            {
                _logger.LogInformation("Processing folder: {RootFolderId}", rootFolderId);

                try
                {
                    // 1. Get the folder itself to see if it contains files directly
                    var rootFolderRequest = service.Files.Get(rootFolderId);
                    rootFolderRequest.Fields = "id, name";
                    rootFolderRequest.SupportsAllDrives = true;
                    var rootFolder = await rootFolderRequest.ExecuteAsync();

                    // 2. Sync files in the root folder (treat root folder name as Advisor name if PDFs are found)
                    await SyncAdvisorFolderAsync(service, dbContext, allAdvisors, rootFolder);

                    // 3. Process subfolders (legacy/multi-advisor structure)
                    var folders = new List<Google.Apis.Drive.v3.Data.File>();
                    string? pageToken = null;
                    do
                    {
                        var folderListRequest = service.Files.List();
                        folderListRequest.Q = $"'{rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
                        folderListRequest.SupportsAllDrives = true;
                        folderListRequest.IncludeItemsFromAllDrives = true;
                        folderListRequest.Fields = "nextPageToken, files(id, name)";
                        folderListRequest.PageToken = pageToken;
                        folderListRequest.PageSize = 1000;
                        
                        var result = await folderListRequest.ExecuteAsync();
                        folders.AddRange(result.Files);
                        pageToken = result.NextPageToken;
                    } while (pageToken != null);

                    _logger.LogInformation("Found {Count} subfolders in {RootName}", folders.Count, rootFolder.Name);

                    foreach (var folder in folders)
                    {
                        if (folder.Name.StartsWith("Test_Connection_")) continue;
                        await SyncAdvisorFolderAsync(service, dbContext, allAdvisors, folder);
                    }
                }
                catch (Exception folderEx)
                {
                    _logger.LogError(folderEx, "Error processing folder {RootFolderId}", rootFolderId);
                }
            }

            _logger.LogInformation("Google Drive synchronization completed.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during Google Drive synchronization");
        }
    }

    private async Task SyncAdvisorFolderAsync(
        DriveService service, 
        ApplicationDbContext dbContext, 
        List<Advisor> allAdvisors, 
        Google.Apis.Drive.v3.Data.File folder)
    {
        var files = new List<Google.Apis.Drive.v3.Data.File>();
        string? filePageToken = null;
        try
        {
            do
            {
                var fileListRequest = service.Files.List();
                fileListRequest.Q = $"'{folder.Id}' in parents and mimeType = 'application/pdf' and trashed = false";
                fileListRequest.SupportsAllDrives = true;
                fileListRequest.IncludeItemsFromAllDrives = true;
                fileListRequest.Fields = "nextPageToken, files(id, name, webViewLink, modifiedTime)";
                fileListRequest.PageToken = filePageToken;
                fileListRequest.PageSize = 1000;
                
                var result = await fileListRequest.ExecuteAsync();
                files.AddRange(result.Files);
                filePageToken = result.NextPageToken;
                _logger.LogInformation("Retrieved page with {Count} files, NextPageToken: {Token}", result.Files?.Count ?? 0, filePageToken ?? "null");
            } while (filePageToken != null);
        }
        catch (Google.GoogleApiException apiEx)
        {
            _logger.LogError(apiEx, "Google API Error listing files in folder {FolderId}: {Message} (Code: {Code})", folder.Id, apiEx.Message, apiEx.HttpStatusCode);
            if (apiEx.HttpStatusCode.ToString().Contains("403"))
            {
                _logger.LogError("Quota exceeded or permission denied. Stopping sync.");
            }
            return;
        }

        if (files.Count == 0) 
        {
            _logger.LogInformation("No PDF files found in folder: {FolderName}", folder.Name);
            return;
        }

        _logger.LogInformation("Syncing {Count} files for folder: {FolderName} ({FolderId})", files.Count, folder.Name, folder.Id);

        var advisor = allAdvisors.FirstOrDefault(a => a.Name.Equals(folder.Name, StringComparison.OrdinalIgnoreCase));
        
        if (advisor == null)
        {
            _logger.LogInformation("Advisor '{FolderName}' not found. Creating...", folder.Name);
            advisor = new Advisor 
            { 
                Name = folder.Name, 
                Code = "AUTO", 
                FirebaseId = "imported_" + Guid.NewGuid().ToString("N").Substring(0, 8) 
            };
            dbContext.Advisors.Add(advisor);
            await dbContext.SaveChangesAsync();
            allAdvisors.Add(advisor);
        }

        foreach (var file in files)
        {
            var (idNum, surname, initial) = ParseFileName(file.Name);
            
            if (string.IsNullOrEmpty(idNum)) 
            {
                _logger.LogDebug("Skipping file {FileName} - name pattern mismatch", file.Name);
                continue;
            }

            var alreadyImported = await dbContext.SubmissionDocuments.AnyAsync(d => d.StorageKey == file.Id);

            if (!alreadyImported)
            {
                _logger.LogInformation("Creating new submission for file: {FileName} ({IdNum} {Surname}) under {Advisor}", file.Name, idNum, surname, advisor.Name);
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
        }
        await dbContext.SaveChangesAsync();
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
