using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Drive.v3;
using Google.Apis.Services;
using Google.Apis.Sheets.v4;
using Google.Apis.Sheets.v4.Data;

class Program
{
    static async Task Main(string[] args)
    {
        var keyFilePath = "brokerApp.API/broker-app-key.json";
        var reportsFolderId = "1f8SeFmgi6e5J1wAzR6GpJoH7UKa2WrgT";

        try
        {
            Console.WriteLine("Loading credentials...");
            GoogleCredential credential;
            using (var stream = new FileStream(keyFilePath, FileMode.Open, FileAccess.Read))
            {
                credential = await GoogleCredential.FromStreamAsync(stream, CancellationToken.None);
                credential = credential.CreateScoped(
                    SheetsService.Scope.Spreadsheets,
                    DriveService.Scope.DriveFile,
                    DriveService.Scope.Drive
                );
            }

            var driveService = new DriveService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "BrokerAppTest"
            });

            var sheetsService = new SheetsService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "BrokerAppTest"
            });

            Console.WriteLine($"Creating spreadsheet directly in folder: {reportsFolderId}...");
            var driveFile = new Google.Apis.Drive.v3.Data.File
            {
                Name = $"Test_Reconciliation_{DateTime.Now:yyyyMMdd_HHmmss}",
                MimeType = "application/vnd.google-apps.spreadsheet",
                Parents = new List<string> { reportsFolderId }
            };

            var createRequest = driveService.Files.Create(driveFile);
            createRequest.Fields = "id, webViewLink";
            var file = await createRequest.ExecuteAsync();
            var spreadsheetId = file.Id;
            var spreadsheetUrl = file.WebViewLink;

            Console.WriteLine($"SUCCESS: Spreadsheet created with ID: {spreadsheetId}");
            Console.WriteLine($"URL: {spreadsheetUrl}");

            Console.WriteLine("Adding sheets and deleting default 'Sheet1'...");
            var batchUpdate = new BatchUpdateSpreadsheetRequest
            {
                Requests = new List<Request>
                {
                    new Request { AddSheet = new AddSheetRequest { Properties = new SheetProperties { Title = "Commissions (Enhanced)" } } },
                    new Request { AddSheet = new AddSheetRequest { Properties = new SheetProperties { Title = "Movements (Enhanced)" } } }
                }
            };
            await sheetsService.Spreadsheets.BatchUpdate(batchUpdate, spreadsheetId).ExecuteAsync();

            var spreadsheetMeta = await sheetsService.Spreadsheets.Get(spreadsheetId).ExecuteAsync();
            var sheet1 = spreadsheetMeta.Sheets.FirstOrDefault(s => s.Properties.Title == "Sheet1");
            if (sheet1 != null)
            {
                await sheetsService.Spreadsheets.BatchUpdate(new BatchUpdateSpreadsheetRequest
                {
                    Requests = new List<Request> { new Request { DeleteSheet = new DeleteSheetRequest { SheetId = sheet1.Properties.SheetId } } }
                }, spreadsheetId).ExecuteAsync();
                Console.WriteLine("Deleted default 'Sheet1'.");
            }

            Console.WriteLine("Setting public permissions (reader)...");
            var permission = new Google.Apis.Drive.v3.Data.Permission
            {
                Type = "anyone",
                Role = "reader"
            };
            await driveService.Permissions.Create(permission, spreadsheetId).ExecuteAsync();
            Console.WriteLine("Permissions set successfully.");

            Console.WriteLine("\nTEST COMPLETE. You can verify the sheet at the URL above.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"\nFATAL ERROR: {ex.Message}");
            if (ex is Google.GoogleApiException gex)
            {
                Console.WriteLine($"API Error: {gex.Error}");
            }
        }
    }
}
