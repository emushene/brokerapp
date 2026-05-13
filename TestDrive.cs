using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Drive.v3;
using Google.Apis.Services;

class Program
{
    static async Task Main(string[] args)
    {
        var keyFilePath = "brokerApp.API/broker-app-key.json";
        var rootFolderId = "1j4Zza8is1EodTWWZR_hr9D9rwXcwg6te";

        try
        {
            Console.WriteLine("Loading credentials...");
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

            Console.WriteLine($"Checking access to folder: {rootFolderId}...");
            var request = service.Files.Get(rootFolderId);
            request.Fields = "id, name, mimeType";
            var folder = await request.ExecuteAsync();

            Console.WriteLine($"Successfully connected!");
            Console.WriteLine($"Folder Name: {folder.Name}");
            Console.WriteLine($"MimeType: {folder.MimeType}");

            Console.WriteLine("\nListing files in folder...");
            var listRequest = service.Files.List();
            listRequest.Q = $"'{rootFolderId}' in parents and trashed = false";
            listRequest.Fields = "files(id, name)";
            var result = await listRequest.ExecuteAsync();

            if (result.Files != null && result.Files.Count > 0)
            {
                foreach (var file in result.Files)
                {
                    Console.WriteLine($"- {file.Name} ({file.Id})");
                }
            }
            else
            {
                Console.WriteLine("No files found in this folder.");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"\nError: {ex.Message}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"Inner Error: {ex.InnerException.Message}");
            }
            Console.WriteLine("\nIMPORTANT: Ensure you have shared the folder with the service account email:");
            Console.WriteLine("broker-app-gdrive-acc@broker-app-493211.iam.gserviceaccount.com");
        }
    }
}
