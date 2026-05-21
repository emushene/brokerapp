using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Drive.v3;
using Google.Apis.Services;

class Program
{
    static async Task Main(string[] args)
    {
        var keyFilePath = "broker-app-key.json";

        try
        {
            Console.WriteLine("Loading credentials...");
            GoogleCredential credential;
            using (var stream = new FileStream(keyFilePath, FileMode.Open, FileAccess.Read))
            {
                credential = await GoogleCredential.FromStreamAsync(stream, CancellationToken.None);
                credential = credential.CreateScoped(DriveService.Scope.Drive);
            }

            var driveService = new DriveService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "BrokerAppCleanup"
            });

            Console.WriteLine("Listing files to delete (everything except folders)...");
            var listRequest = driveService.Files.List();
            listRequest.Fields = "nextPageToken, files(id, name, mimeType)";
            listRequest.Q = "trashed = false and mimeType != 'application/vnd.google-apps.folder'";
            var result = await listRequest.ExecuteAsync();

            if (result.Files != null && result.Files.Count > 0)
            {
                Console.WriteLine($"Found {result.Files.Count} files. Starting deletion...");
                foreach (var file in result.Files)
                {
                    try {
                        Console.WriteLine($"Deleting: {file.Name} ({file.Id})");
                        await driveService.Files.Delete(file.Id).ExecuteAsync();
                    } catch (Exception ex) {
                        Console.WriteLine($"Failed to delete {file.Name}: {ex.Message}");
                    }
                }
                Console.WriteLine("Deletion complete.");
            }
            else
            {
                Console.WriteLine("No files found to delete.");
            }

            // Also empty trash
            Console.WriteLine("Emptying trash...");
            await driveService.Files.EmptyTrash().ExecuteAsync();
            Console.WriteLine("Trash emptied.");
            
            Console.WriteLine("\nChecking Quota again...");
            var aboutRequest = driveService.About.Get();
            aboutRequest.Fields = "storageQuota";
            var about = await aboutRequest.ExecuteAsync();
            Console.WriteLine($"Usage: {about.StorageQuota.Usage}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"\nERROR: {ex.Message}");
        }
    }
}
