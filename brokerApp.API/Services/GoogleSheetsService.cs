using Google.Apis.Auth.OAuth2;
using Google.Apis.Drive.v3;
using Google.Apis.Services;
using Google.Apis.Sheets.v4;
using Google.Apis.Sheets.v4.Data;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using brokerApp.API.Models;

namespace brokerApp.API.Services;

public interface IGoogleSheetsService
{
    Task<string> CreateReconciliationSheetAsync(CommissionStatement statement);
    Task DeleteSheetAsync(string spreadsheetUrl);
}

public class GoogleSheetsService : IGoogleSheetsService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<GoogleSheetsService> _logger;

    public GoogleSheetsService(IConfiguration configuration, ILogger<GoogleSheetsService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    private async Task<GoogleCredential> GetCredentialAsync()
    {
        GoogleCredential credential;
        var serviceAccountJson = _configuration["GoogleDrive:ServiceAccountJson"];

        if (!string.IsNullOrEmpty(serviceAccountJson))
        {
            _logger.LogInformation("Google Sheets: Loading credentials from Secret Manager (JSON)");
            credential = GoogleCredential.FromJson(serviceAccountJson);
        }
        else
        {
            var keyFilePath = _configuration["GoogleDrive:KeyFilePath"] ?? "broker-app-key.json";
            _logger.LogInformation("Loading Google Drive credentials from: {Path}", keyFilePath);
            
            if (!File.Exists(keyFilePath))
            {
                // Try looking in the API project folder specifically
                var apiPath = Path.Combine("brokerApp.API", keyFilePath);
                if (File.Exists(apiPath))
                {
                    keyFilePath = apiPath;
                    _logger.LogInformation("Found key file at fallback path: {Path}", keyFilePath);
                }
                else
                {
                    _logger.LogError("Google Drive Key file not found at: {Path} or {ApiPath}", 
                        Path.GetFullPath(keyFilePath), Path.GetFullPath(apiPath));
                    throw new FileNotFoundException("Google Drive Key file not found", keyFilePath);
                }
            }

            using var stream = new FileStream(keyFilePath, FileMode.Open, FileAccess.Read);
            credential = await GoogleCredential.FromStreamAsync(stream, CancellationToken.None);
        }

        return credential.CreateScoped(
            SheetsService.Scope.Spreadsheets,
            DriveService.Scope.DriveFile,
            DriveService.Scope.Drive
        );
    }

    public async Task DeleteSheetAsync(string spreadsheetUrl)
    {
        if (string.IsNullOrEmpty(spreadsheetUrl)) return;

        try
        {
            var match = System.Text.RegularExpressions.Regex.Match(spreadsheetUrl, @"/d/([^/]+)");
            if (!match.Success) return;

            var spreadsheetId = match.Groups[1].Value;
            var credential = await GetCredentialAsync();
            var driveService = new DriveService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "BrokerApp"
            });

            _logger.LogInformation("Deleting Google Sheet: {SpreadsheetId}", spreadsheetId);
            await driveService.Files.Delete(spreadsheetId).ExecuteAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting Google Sheet {Url}", spreadsheetUrl);
        }
    }

    public async Task<string> CreateReconciliationSheetAsync(CommissionStatement statement)
    {
        try
        {
            _logger.LogInformation("Starting Google Sheet creation for statement: {FileName}", statement.FileName);
            var credential = await GetCredentialAsync();
            
            var sheetsService = new SheetsService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "BrokerApp"
            });

            var driveService = new DriveService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "BrokerApp"
            });

            var reportsFolderId = _configuration["GoogleDrive:ReportsFolderId"];
            string spreadsheetId;
            string spreadsheetUrl;

            if (!string.IsNullOrEmpty(reportsFolderId))
            {
                _logger.LogInformation("Creating spreadsheet directly in folder: {FolderId}", reportsFolderId);
                var driveFile = new Google.Apis.Drive.v3.Data.File
                {
                    Name = $"Reconciliation_{statement.StatementDate:yyyy-MM-dd}_{statement.FileName}",
                    MimeType = "application/vnd.google-apps.spreadsheet",
                    Parents = new List<string> { reportsFolderId }
                };

                var createRequest = driveService.Files.Create(driveFile);
                createRequest.Fields = "id,webViewLink";
                var file = await createRequest.ExecuteAsync();
                spreadsheetId = file.Id;
                spreadsheetUrl = file.WebViewLink;
                _logger.LogInformation("Spreadsheet created successfully in target folder with ID: {Id}", spreadsheetId);
                
                // Need to add the sheets since we created an empty spreadsheet via Drive API
                // Actually, an empty spreadsheet created this way usually has one "Sheet1"
                // We want our specific names. We'll rename Sheet1 and add another, or just update.
                // For simplicity, let's just use the sheetsService to update titles if needed, 
                // but usually populate will work if we specify the range.
                // However, the Spreadsheet object approach was cleaner for initial sheet setup.
                
                // Let's ensure the sheets exist by calling batchUpdate if necessary, 
                // but Sheets API will auto-create sheets in some cases or we can just use "Sheet1"
                // To be safe and consistent with previous logic, let's add our named sheets.
                var batchUpdate = new BatchUpdateSpreadsheetRequest
                {
                    Requests = new List<Request>
                    {
                        new Request { AddSheet = new AddSheetRequest { Properties = new SheetProperties { Title = "Commissions (Enhanced)" } } },
                        new Request { AddSheet = new AddSheetRequest { Properties = new SheetProperties { Title = "Movements (Enhanced)" } } }
                    }
                };
                await sheetsService.Spreadsheets.BatchUpdate(batchUpdate, spreadsheetId).ExecuteAsync();
                
                // Try to remove default "Sheet1"
                try {
                    var spreadsheetMeta = await sheetsService.Spreadsheets.Get(spreadsheetId).ExecuteAsync();
                    var sheet1 = spreadsheetMeta.Sheets.FirstOrDefault(s => s.Properties.Title == "Sheet1");
                    if (sheet1 != null) {
                        await sheetsService.Spreadsheets.BatchUpdate(new BatchUpdateSpreadsheetRequest {
                            Requests = new List<Request> { new Request { DeleteSheet = new DeleteSheetRequest { SheetId = sheet1.Properties.SheetId } } }
                        }, spreadsheetId).ExecuteAsync();
                    }
                } catch { /* Ignore if Sheet1 deletion fails */ }
            }
            else
            {
                _logger.LogWarning("GoogleDrive:ReportsFolderId is NOT configured. Creating in root.");
                var spreadsheet = new Spreadsheet
                {
                    Properties = new SpreadsheetProperties
                    {
                        Title = $"Reconciliation_{statement.StatementDate:yyyy-MM-dd}_{statement.FileName}"
                    },
                    Sheets = new List<Sheet>
                    {
                        new Sheet { Properties = new SheetProperties { Title = "Commissions (Enhanced)" } },
                        new Sheet { Properties = new SheetProperties { Title = "Movements (Enhanced)" } }
                    }
                };

                var createdSpreadsheet = await sheetsService.Spreadsheets.Create(spreadsheet).ExecuteAsync();
                spreadsheetId = createdSpreadsheet.SpreadsheetId;
                spreadsheetUrl = createdSpreadsheet.SpreadsheetUrl;
                _logger.LogInformation("Spreadsheet created successfully in root with ID: {Id}", spreadsheetId);
            }

            // 1. Populate Commissions
            _logger.LogInformation("Populating Commissions sheet with {Count} items...", statement.Items.Count);
            await PopulateCommissionsSheet(sheetsService, spreadsheetId, statement.Items);

            // 2. Populate Movements
            _logger.LogInformation("Populating Movements sheet with {Count} items...", statement.MovementItems.Count);
            await PopulateMovementsSheet(sheetsService, spreadsheetId, statement.MovementItems);

            // 3. Set Permissions (Anyone with link can view)
            try
            {
                _logger.LogInformation("Setting public read permissions for spreadsheet {Id}...", spreadsheetId);
                var permission = new Google.Apis.Drive.v3.Data.Permission
                {
                    Type = "anyone",
                    Role = "reader"
                };
                await driveService.Permissions.Create(permission, spreadsheetId).ExecuteAsync();
                _logger.LogInformation("Public permissions set successfully.");
            }
            catch (Exception permEx)
            {
                _logger.LogWarning(permEx, "Could not set public permissions on the sheet. It may only be visible to the service account.");
            }

            _logger.LogInformation("Google Sheet creation complete: {Url}", spreadsheetUrl);
            return spreadsheetUrl;
        }
        catch (Exception ex)
        {
            if (ex is Google.GoogleApiException gex)
            {
                _logger.LogError(gex, "FATAL Error creating Google Sheet for reconciliation: {Message}\nError Details: {Error}", 
                    gex.Message, gex.Error?.ToString() ?? "No details available");
            }
            else
            {
                _logger.LogError(ex, "FATAL Error creating Google Sheet for reconciliation: {Message}", ex.Message);
            }
            return string.Empty;
        }
    }

    private async Task PopulateCommissionsSheet(SheetsService service, string spreadsheetId, IEnumerable<StatementItem> items)
    {
        var values = new List<IList<object>>();
        
        values.Add(new List<object> 
        { 
            "Policy Number", "Client Name", "Type", "Sub Type", "Premium", "Commission Amount", "Category", 
            "Matched Advisor", "Sales Force Name", "ClawBack", "ClawBack (Retention)", "ClawBack Reason", "Scan Date", "Link to Scan" 
        });

        foreach (var item in items)
        {
            values.Add(new List<object>
            {
                item.PolicyNumber,
                item.ClientName,
                item.CommissionType,
                item.CommissionSubType,
                item.Premium,
                item.Amount,
                item.Category,
                item.AdvisorName ?? "NOT MATCHED",
                item.SalesForceName ?? "",
                item.ClawBack ?? 0m,
                item.ClawBackRetention ?? 0m,
                item.ClawBackReason ?? "",
                item.MatchedSubmission?.CreatedAt.ToString("yyyy-MM-dd HH:mm") ?? "",
                item.GoogleDriveLink ?? ""
            });
        }

        _logger.LogDebug("Sending Commissions data to Google Sheets API...");
        var range = "Commissions (Enhanced)!A1";
        var valueRange = new ValueRange { Values = values };
        var updateRequest = service.Spreadsheets.Values.Update(valueRange, spreadsheetId, range);
        updateRequest.ValueInputOption = SpreadsheetsResource.ValuesResource.UpdateRequest.ValueInputOptionEnum.USERENTERED;
        await updateRequest.ExecuteAsync();
        _logger.LogDebug("Commissions data population complete.");
    }

    private async Task PopulateMovementsSheet(SheetsService service, string spreadsheetId, IEnumerable<MovementItem> items)
    {
        var values = new List<IList<object>>();

        values.Add(new List<object>
        {
            "Policy Number", "Client Name", "Movement Type", "Effective Date", "Premium", "Category",
            "Matched Advisor", "Scan Date", "Link to Scan"
        });

        foreach (var item in items)
        {
            values.Add(new List<object>
            {
                item.PolicyNumber,
                item.ClientName,
                item.MovementType,
                item.EffectiveDate?.ToString("yyyy-MM-dd") ?? "",
                item.Premium,
                item.Category,
                item.AdvisorName ?? "NOT MATCHED",
                item.MatchedSubmission?.CreatedAt.ToString("yyyy-MM-dd HH:mm") ?? "",
                item.GoogleDriveLink ?? ""
            });
        }

        _logger.LogDebug("Sending Movements data to Google Sheets API...");
        var range = "Movements (Enhanced)!A1";
        var valueRange = new ValueRange { Values = values };
        var updateRequest = service.Spreadsheets.Values.Update(valueRange, spreadsheetId, range);
        updateRequest.ValueInputOption = SpreadsheetsResource.ValuesResource.UpdateRequest.ValueInputOptionEnum.USERENTERED;
        await updateRequest.ExecuteAsync();
        _logger.LogDebug("Movements data population complete.");
    }
}
