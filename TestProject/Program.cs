using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Drive.v3;
using Google.Apis.Services;

class Program
{
    static async Task Main(string[] args)
    {
        var keyFilePath = "../brokerApp.API/joska-fin-key.json";
        var parentFolderId = "1xSb_7fIkfEjx_YMsPQDW-NrK82Ye54sG"; // ASSUPOL

        try
        {
            GoogleCredential credential;
            using (var stream = new FileStream(keyFilePath, FileMode.Open, FileAccess.Read))
            {
                credential = await GoogleCredential.FromStreamAsync(stream, CancellationToken.None);
                credential = credential.CreateScoped(DriveService.Scope.DriveMetadataReadonly);
            }

            var service = new DriveService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "FolderLister"
            });

            Console.WriteLine($"Listing subfolders in ASSUPOL ({parentFolderId})...");
            var request = service.Files.List();
            request.Q = $"'{parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
            request.Fields = "files(id, name)";
            request.SupportsAllDrives = true;
            request.IncludeItemsFromAllDrives = true;
            
            var result = await request.ExecuteAsync();

            if (result.Files != null && result.Files.Count > 0)
            {
                foreach (var file in result.Files)
                {
                    Console.WriteLine($"- {file.Name} (ID: {file.Id})");
                }
            }
            else
            {
                Console.WriteLine("No subfolders found.");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"\nERROR: {ex.Message}");
        }
    }
}
