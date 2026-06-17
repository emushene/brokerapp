using Google.Apis.Auth.OAuth2;
using Google.Apis.Drive.v3;
using Google.Apis.Services;

var keyFilePath = "joska-fin-key.json";
var folderId = "13VVLN5Mypnmf22ql1Lhg-DtKGH_k-At0"; // Using folder from .env

try {
    Console.WriteLine($"Testing connection to folder: {folderId} using {keyFilePath}");
    
    GoogleCredential credential;
    using (var stream = new FileStream(keyFilePath, FileMode.Open, FileAccess.Read))
    {
        credential = GoogleCredential.FromStream(stream)
            .CreateScoped(DriveService.Scope.DriveMetadataReadonly);
    }

    var service = new DriveService(new BaseClientService.Initializer()
    {
        HttpClientInitializer = credential,
        ApplicationName = "ConnectionTester",
    });

    var request = service.Files.Get(folderId);
    request.Fields = "id, name";
    request.SupportsAllDrives = true;
    var folder = await request.ExecuteAsync();

    Console.WriteLine($"Successfully connected! Folder Name: {folder.Name}");
} catch (Exception ex) {
    Console.WriteLine($"Connection failed: {ex.Message}");
    if (ex.InnerException != null) Console.WriteLine($"Inner: {ex.InnerException.Message}");
}
