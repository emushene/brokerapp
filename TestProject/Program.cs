using System;
using System.IO;
using System.Threading.Tasks;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Drive.v3;
using Google.Apis.Services;

class Program
{
    static async Task Main(string[] args)
    {
        var keyFilePath = Path.Combine(Directory.GetCurrentDirectory(), "brokerApp.API", "broker-app-key.json");
        var rootFolderId = "1-0SxxYnKTE7KvHyGIqKqkT6Lu1E_ejhY";

        try
        {
            Console.WriteLine($"Loading credentials from {keyFilePath}...");
            GoogleCredential credential;
            using (var stream = new FileStream(keyFilePath, FileMode.Open, FileAccess.Read))
            {
                credential = GoogleCredential.FromStream(stream)
                    .CreateScoped(DriveService.Scope.DriveFile, DriveService.Scope.DriveMetadataReadonly);
            }

            var service = new DriveService(new BaseClientService.Initializer()
            {
                HttpClientInitializer = credential,
                ApplicationName = "BrokerAppTest",
            });

            Console.WriteLine($"Service account client email: {((ServiceAccountCredential)credential.UnderlyingCredential).Id}");

            Console.WriteLine($"Checking access to folder: {rootFolderId}...");
            var request = service.Files.Get(rootFolderId);
            request.Fields = "id, name, mimeType";
            var folder = await request.ExecuteAsync();

            Console.WriteLine($"Successfully connected!");
            Console.WriteLine($"Folder Name: {folder.Name}");
            Console.WriteLine($"MimeType: {folder.MimeType}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"\nError: {ex.Message}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"Inner Error: {ex.InnerException.Message}");
            }
        }
    }
}
