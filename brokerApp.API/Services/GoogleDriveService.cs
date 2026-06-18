using Google.Apis.Auth.OAuth2;
using Google.Apis.Drive.v3;
using Google.Apis.Services;
using Microsoft.Extensions.Configuration;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace brokerApp.API.Services;

public class GoogleDriveService : IFileStorageService
{
    private readonly DriveService _driveService;
    private readonly string _rootFolderId;

    public GoogleDriveService(IConfiguration configuration)
    {
        var serviceAccountJson = configuration["GoogleDrive:ServiceAccountJson"];
        GoogleCredential credential;

        if (!string.IsNullOrEmpty(serviceAccountJson))
        {
            credential = GoogleCredential.FromJson(serviceAccountJson)
                .CreateScoped(DriveService.Scope.DriveFile);
        }
        else
        {
            var keyFilePath = configuration["GoogleDrive:KeyFilePath"] ?? "broker-app-key.json";
            credential = GoogleCredential.FromFile(keyFilePath)
                .CreateScoped(DriveService.Scope.DriveFile);
        }

        _driveService = new DriveService(new BaseClientService.Initializer()
        {
            HttpClientInitializer = credential,
            ApplicationName = "BrokerApp",
        });

        _rootFolderId = configuration["GoogleDrive:RootFolderId"] ?? "";
    }

    private async Task<string> GetOrCreateFolderAsync(string? folderPath)
    {
        if (string.IsNullOrEmpty(folderPath)) return _rootFolderId;

        var folders = folderPath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var parentId = _rootFolderId;

        foreach (var folderName in folders)
        {
            var query = $"name = '{folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
            if (!string.IsNullOrEmpty(parentId))
            {
                query += $" and '{parentId}' in parents";
            }
            
            var listRequest = _driveService.Files.List();
            listRequest.Q = query;
            listRequest.Fields = "files(id)";
            var result = await listRequest.ExecuteAsync();

            var folder = result.Files.FirstOrDefault();
            if (folder == null)
            {
                var newFolder = new Google.Apis.Drive.v3.Data.File
                {
                    Name = folderName,
                    MimeType = "application/vnd.google-apps.folder",
                    Parents = string.IsNullOrEmpty(parentId) ? null : new List<string> { parentId }
                };
                folder = await _driveService.Files.Create(newFolder).ExecuteAsync();
            }
            parentId = folder.Id;
        }

        return parentId;
    }

    public async Task<string> UploadFileAsync(Stream stream, string fileName, string contentType, string? folderPath = null)
    {
        var parentId = await GetOrCreateFolderAsync(folderPath);

        var fileMetadata = new Google.Apis.Drive.v3.Data.File()
        {
            Name = fileName,
            Parents = string.IsNullOrEmpty(parentId) ? null : new List<string> { parentId }
        };

        FilesResource.CreateMediaUpload request;
        request = _driveService.Files.Create(fileMetadata, stream, contentType);
        request.Fields = "id";
        await request.UploadAsync();

        var file = request.ResponseBody;

        // Make the file readable by anyone with the link
        try
        {
            var permission = new Google.Apis.Drive.v3.Data.Permission
            {
                Type = "anyone",
                Role = "reader"
            };
            await _driveService.Permissions.Create(permission, file.Id).ExecuteAsync();
        }
        catch
        {
            // Logging or handling if permissions cannot be set
        }

        return file.Id;
    }

    public async Task<string> GetFileUrlAsync(string storageKey)
    {
        var request = _driveService.Files.Get(storageKey);
        request.Fields = "webViewLink";
        var file = await request.ExecuteAsync();
        return file.WebViewLink;
    }

    public async Task DeleteFileAsync(string storageKey)
    {
        await _driveService.Files.Delete(storageKey).ExecuteAsync();
    }
}
