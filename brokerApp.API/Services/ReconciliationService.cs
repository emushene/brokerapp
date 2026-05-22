using brokerApp.API.Data;
using brokerApp.API.Models;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;

namespace brokerApp.API.Services;

public interface IReconciliationService
{
    Task<CommissionStatement> ProcessStatementAsync(Stream fileStream, string fileName, DateTime statementDate, string? fileUrl = null);
}

public class ReconciliationService : IReconciliationService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ReconciliationService> _logger;
    private readonly IGoogleSheetsService _sheetsService;
    private readonly IFileStorageService _fileStorageService;

    public ReconciliationService(
        ApplicationDbContext context, 
        ILogger<ReconciliationService> logger, 
        IGoogleSheetsService sheetsService,
        IFileStorageService fileStorageService)
    {
        _context = context;
        _logger = logger;
        _sheetsService = sheetsService;
        _fileStorageService = fileStorageService;
    }

    public async Task<CommissionStatement> ProcessStatementAsync(Stream fileStream, string fileName, DateTime statementDate, string? fileUrl = null)
    {
        _logger.LogInformation("Starting ProcessStatementAsync for file: {FileName}, Date: {Date}", fileName, statementDate);
        
        var normalizedDate = DateTime.SpecifyKind(statementDate.Date, DateTimeKind.Utc);
        
        // 0. Deduplication Check - Return existing if found
        var existing = await _context.CommissionStatements
            .Include(s => s.Items)
            .Include(s => s.MovementItems)
            .FirstOrDefaultAsync(s => s.FileName == fileName && s.StatementDate == normalizedDate);
            
        if (existing != null)
        {
            _logger.LogInformation("Statement already exists with ID: {Id}. Returning existing statement.", existing.Id);
            return existing;
        }

        using var workbook = new XLWorkbook(fileStream);
        
        var statement = new CommissionStatement
        {
            FileName = fileName,
            FileUrl = fileUrl,
            StatementDate = normalizedDate,
            UploadDate = DateTime.UtcNow
        };

        // Fetch Master Policy Records and all Submissions
        _logger.LogInformation("Fetching master policy records and submissions...");
        var masterPolicies = await _context.PolicyRecords
            .Include(p => p.Advisors)
            .ToListAsync();

        var allSubmissions = await _context.Submissions
            .Include(s => s.Advisors)
            .Include(s => s.Documents)
            .ToListAsync();

        // 1. Process "Movement" Sheet FIRST (Priority for status and registration)
        if (workbook.Worksheets.TryGetWorksheet("Movement", out var moveSheet))
        {
            _logger.LogInformation("Processing 'Movement' worksheet...");
            
            // Find columns dynamically
            var headerRow = moveSheet.Row(1);
            int policyCol = 6, clientCol = 5, amountCol = 11, typeCol = 15, dateCol = 12, premCol = 10;
            
            for (int c = 1; c <= headerRow.LastCellUsed().Address.ColumnNumber; c++)
            {
                var val = headerRow.Cell(c).Value.ToString().Replace(" ", "").Replace("(", "").Replace(")", "").ToLower();
                if (val.Contains("policynumber")) policyCol = c;
                else if (val.Contains("client") || val.Contains("cleint")) clientCol = c;
                else if (val.Contains("nett") && !val.Contains("clawback")) amountCol = c; 
                else if (val.Contains("premium") || val.Contains("prem")) premCol = c;
                else if (val.Contains("type") && val.Contains("commission") && !val.Contains("sub")) typeCol = c;
                else if (val.Contains("effectivedate")) dateCol = c;
                else if (val.Contains("date") && dateCol == 12) dateCol = c; // Only update if still default
            }

            _logger.LogInformation("Movement Columns: Policy={P}, Client={C}, Amount={A}, Premium={PR}, Type={T}, Date={D}", policyCol, clientCol, amountCol, premCol, typeCol, dateCol);

            var rows = moveSheet.RowsUsed().Skip(1);
            int moveCount = 0;
            foreach (var row in rows)
            {
                var policyNumber = row.Cell(policyCol).Value.ToString().Trim();
                var clientName = row.Cell(clientCol).Value.ToString().Trim();
                
                if (string.IsNullOrEmpty(policyNumber) && string.IsNullOrEmpty(clientName)) continue;

                var subType = row.Cell(typeCol).Value.ToString().Trim();
                
                // Strict Filtering: Only process First Year and Second Year Commission
                var isFirstYear = subType.Equals("First Year Commission", StringComparison.OrdinalIgnoreCase);
                var isSecondYear = subType.Equals("Second Year Commission", StringComparison.OrdinalIgnoreCase);

                if (!isFirstYear && !isSecondYear) 
                {
                    continue;
                }

                moveCount++;
                var amount = ParseDecimal(row.Cell(amountCol).Value.ToString());
                var premium = ParseDecimal(row.Cell(premCol).Value.ToString());
                
                var category = isFirstYear ? "First Year Commission" : "Second Year Commission";
                if (amount < 0) category = "Lapse";

                var moveItem = new MovementItem
                {
                    ClientName = clientName,
                    PolicyNumber = policyNumber,
                    MovementType = subType,
                    Premium = premium,
                    EffectiveDate = row.Cell(dateCol).Value.IsDateTime ? row.Cell(dateCol).Value.GetDateTime().ToUniversalTime() : (DateTime?)null,
                    Category = category
                };

                // MATCHING & AUTO-REGISTRATION
                var masterMatch = masterPolicies.FirstOrDefault(p => p.PolicyNumber.Equals(policyNumber, StringComparison.OrdinalIgnoreCase));
                if (masterMatch != null)
                {
                    moveItem.IsConfirmed = masterMatch.IsConfirmed;
                    moveItem.AdvisorName = string.Join(", ", masterMatch.Advisors.Select(a => a.Name));
                    
                    // Update premium and commission if available
                    if (premium > 0) masterMatch.Premium = premium;
                    masterMatch.LastCommissionAmount = amount;
                    masterMatch.LastUpdated = DateTime.UtcNow;

                    var subMatch = allSubmissions.FirstOrDefault(s => s.PolicyNumber.Equals(policyNumber, StringComparison.OrdinalIgnoreCase));
                    if (subMatch != null)
                    {
                        moveItem.MatchedSubmissionId = subMatch.Id;
                        moveItem.MatchedSubmission = subMatch;
                        moveItem.FileUrl = subMatch.Documents.OrderByDescending(d => d.DateModified).FirstOrDefault()?.FileUrl;
                        moveItem.GoogleDriveLink = moveItem.FileUrl;
                        
                        // Fallback for premium if statement is missing it
                        if (moveItem.Premium == 0) moveItem.Premium = subMatch.Premium;
                    }
                    
                    if (category == "Lapse" && moveItem.IsConfirmed)
                    {
                        if (subMatch != null) subMatch.Status = SubmissionStatus.Lapsed;
                        masterMatch.Status = SubmissionStatus.Lapsed;
                    }
                    statement.MatchedRows++;
                }
                else
                {
                    var subMatch = FindMatch(policyNumber, clientName, allSubmissions, out bool isPolicyMatch);
                    if (subMatch != null)
                    {
                        // Fallback for premium if statement is missing it
                        var finalPremium = premium > 0 ? premium : subMatch.Premium;

                        // AUTO-REGISTER into Master
                        var newMaster = new PolicyRecord
                        {
                            PolicyNumber = policyNumber,
                            Surname = subMatch.ApplicantSurname,
                            Initials = subMatch.Initials,
                            Premium = finalPremium,
                            LastCommissionAmount = amount,
                            Status = category == "Lapse" ? SubmissionStatus.Lapsed : SubmissionStatus.Active,
                            LastUpdated = DateTime.UtcNow,
                            IsConfirmed = false // Waiting for human review
                        };
                        foreach (var adv in subMatch.Advisors) newMaster.Advisors.Add(adv);
                        
                        _context.PolicyRecords.Add(newMaster);
                        masterPolicies.Add(newMaster); // Add to local list for subsequent matches

                        moveItem.MatchedSubmissionId = subMatch.Id;
                        moveItem.MatchedSubmission = subMatch;
                        moveItem.Premium = finalPremium;
                        moveItem.AdvisorName = subMatch.AdvisorGroupId.HasValue && subMatch.AdvisorGroup != null
                            ? $"Group: {subMatch.AdvisorGroup.Name}"
                            : string.Join(", ", subMatch.Advisors.Select(a => a.Name));
                        moveItem.IsConfirmed = false;
                        
                        var latestDoc = subMatch.Documents.OrderByDescending(d => d.DateModified).FirstOrDefault();
                        moveItem.FileUrl = latestDoc?.FileUrl;
                        moveItem.GoogleDriveLink = latestDoc?.FileUrl;
                        
                        statement.MatchedRows++;
                    }
                }

                statement.MovementItems.Add(moveItem);
            }
            _logger.LogInformation("Processed {Count} relevant rows from Movement sheet.", moveCount);
        }

        // 2. Process "Commission Details" Sheet
        if (workbook.Worksheets.TryGetWorksheet("Commission Details", out var commSheet))
        {
            _logger.LogInformation("Processing 'Commission Details' worksheet...");

            // Find columns dynamically
            var headerRow = commSheet.Row(1);
            int policyCol = 10, clientCol = 9, amountCol = 23, premCol = 12, typeCol = 2;

            for (int c = 1; c <= headerRow.LastCellUsed().Address.ColumnNumber; c++)
            {
                var val = headerRow.Cell(c).Value.ToString().Replace(" ", "").Replace("(", "").Replace(")", "").ToLower();
                if (val.Contains("policynumber")) policyCol = c;
                else if (val.Contains("clientname")) clientCol = c;
                else if (val.Contains("nett") && !val.Contains("clawback")) amountCol = c;
                else if (val.Contains("premium") || val.Contains("prem")) premCol = c;
                else if (val.Contains("type") && val.Contains("commission") && !val.Contains("sub")) typeCol = c;
            }

            _logger.LogInformation("CommDetails Columns: Policy={P}, Client={C}, Amount={A}, Premium={PR}, Type={T}", policyCol, clientCol, amountCol, premCol, typeCol);

            var rows = commSheet.RowsUsed().Skip(1); 
            int commCount = 0;
            foreach (var row in rows)
            {
                var policyNumber = row.Cell(policyCol).Value.ToString().Trim();
                var clientName = row.Cell(clientCol).Value.ToString().Trim();

                if (string.IsNullOrEmpty(policyNumber) && string.IsNullOrEmpty(clientName)) continue;

                var subType = row.Cell(typeCol).Value.ToString().Trim();
                
                // Strict Filtering: Only process First Year and Second Year Commission
                var isFirstYear = subType.Equals("First Year Commission", StringComparison.OrdinalIgnoreCase);
                var isSecondYear = subType.Equals("Second Year Commission", StringComparison.OrdinalIgnoreCase);

                if (!isFirstYear && !isSecondYear) 
                {
                    continue; // Skip all other types (Recurring, Service, etc.)
                }

                commCount++;
                var amount = ParseDecimal(row.Cell(amountCol).Value.ToString());
                var premium = ParseDecimal(row.Cell(premCol).Value.ToString());
                
                var category = isFirstYear ? "First Year Commission" : "Second Year Commission";
                if (amount < 0) category = "Lapse";

                var item = new StatementItem
                {
                    ClientName = clientName,
                    PolicyNumber = policyNumber,
                    CommissionType = subType,
                    CommissionSubType = subType,
                    Amount = amount,
                    Premium = premium,
                    Category = category
                };

                // MATCHING & AUTO-REGISTRATION
                var masterMatch = masterPolicies.FirstOrDefault(p => p.PolicyNumber.Equals(policyNumber, StringComparison.OrdinalIgnoreCase));
                if (masterMatch != null)
                {
                    item.IsConfirmed = masterMatch.IsConfirmed;
                    item.AdvisorName = string.Join(", ", masterMatch.Advisors.Select(a => a.Name));
                    
                    // Update premium and commission if available
                    if (premium > 0) masterMatch.Premium = premium;
                    masterMatch.LastCommissionAmount = amount;
                    masterMatch.LastUpdated = DateTime.UtcNow;
                    
                    var subMatch = allSubmissions.FirstOrDefault(s => s.PolicyNumber.Equals(policyNumber, StringComparison.OrdinalIgnoreCase));
                    if (subMatch != null)
                    {
                        item.MatchedSubmissionId = subMatch.Id;
                        item.MatchedSubmission = subMatch;
                        item.FileUrl = subMatch.Documents.OrderByDescending(d => d.DateModified).FirstOrDefault()?.FileUrl;
                        item.GoogleDriveLink = item.FileUrl;
                        
                        // Fallback for premium if statement is missing it
                        if (item.Premium == 0) item.Premium = subMatch.Premium;
                    }
                    
                    if (category == "Lapse" && item.IsConfirmed && subMatch != null)
                    {
                        subMatch.Status = SubmissionStatus.Lapsed;
                        masterMatch.Status = SubmissionStatus.Lapsed;
                    }
                    statement.MatchedRows++;
                }
                else
                {
                    var subMatch = FindMatch(policyNumber, clientName, allSubmissions, out bool isPolicyMatch);
                    if (subMatch != null)
                    {
                        // Fallback for premium if statement is missing it
                        var finalPremium = premium > 0 ? premium : subMatch.Premium;

                        // AUTO-REGISTER into Master
                        var newMaster = new PolicyRecord
                        {
                            PolicyNumber = policyNumber,
                            Surname = subMatch.ApplicantSurname,
                            Initials = subMatch.Initials,
                            Premium = finalPremium,
                            LastCommissionAmount = amount,
                            Status = category == "Lapse" ? SubmissionStatus.Lapsed : SubmissionStatus.Active,
                            LastUpdated = DateTime.UtcNow,
                            IsConfirmed = false // Waiting for human review
                        };
                        foreach (var adv in subMatch.Advisors) newMaster.Advisors.Add(adv);
                        
                        _context.PolicyRecords.Add(newMaster);
                        masterPolicies.Add(newMaster);

                        item.MatchedSubmissionId = subMatch.Id;
                        item.MatchedSubmission = subMatch;
                        item.Premium = finalPremium;
                        item.AdvisorName = string.Join(", ", subMatch.Advisors.Select(a => a.Name));
                        item.IsConfirmed = false;
                        
                        var latestDoc = subMatch.Documents.OrderByDescending(d => d.DateModified).FirstOrDefault();
                        item.FileUrl = latestDoc?.FileUrl;
                        item.GoogleDriveLink = latestDoc?.FileUrl;
                        
                        statement.MatchedRows++;
                    }
                }

                statement.Items.Add(item);
                statement.TotalCommission += item.Amount;
                statement.TotalRows++;
            }
            _logger.LogInformation("Processed {Count} relevant rows from Commission Details sheet.", commCount);
        }

        // Generate the Excel Report
        _logger.LogInformation("Generating enhanced Excel report for reconciliation...");
        try
        {
            using (var ms = new MemoryStream())
            {
                var reportWorkbook = new XLWorkbook();
                
                // 1. Commissions Sheet
                var reportCommSheet = reportWorkbook.Worksheets.Add("Commissions (Enhanced)");
                reportCommSheet.Cell(1, 1).Value = "Policy Number";
                reportCommSheet.Cell(1, 2).Value = "Client Name";
                reportCommSheet.Cell(1, 3).Value = "Type";
                reportCommSheet.Cell(1, 4).Value = "Sub Type";
                reportCommSheet.Cell(1, 5).Value = "Premium";
                reportCommSheet.Cell(1, 6).Value = "Commission Amount";
                reportCommSheet.Cell(1, 7).Value = "Category";
                reportCommSheet.Cell(1, 8).Value = "Matched Advisor";
                reportCommSheet.Cell(1, 9).Value = "Scan Date";
                reportCommSheet.Cell(1, 10).Value = "Link to Scan";
                reportCommSheet.Range("A1:J1").Style.Font.Bold = true;

                int row = 2;
                foreach (var item in statement.Items)
                {
                    reportCommSheet.Cell(row, 1).Value = item.PolicyNumber;
                    reportCommSheet.Cell(row, 2).Value = item.ClientName;
                    reportCommSheet.Cell(row, 3).Value = item.CommissionType;
                    reportCommSheet.Cell(row, 4).Value = item.CommissionSubType;
                    reportCommSheet.Cell(row, 5).Value = item.Premium;
                    reportCommSheet.Cell(row, 6).Value = item.Amount;
                    reportCommSheet.Cell(row, 7).Value = item.Category;
                    reportCommSheet.Cell(row, 8).Value = item.AdvisorName ?? "NOT MATCHED";
                    reportCommSheet.Cell(row, 9).Value = item.MatchedSubmission?.CreatedAt.ToString("yyyy-MM-dd HH:mm") ?? "";
                    reportCommSheet.Cell(row, 10).Value = item.GoogleDriveLink ?? "";
                    if (!string.IsNullOrEmpty(item.GoogleDriveLink))
                        reportCommSheet.Cell(row, 10).SetHyperlink(new XLHyperlink(item.GoogleDriveLink));
                    row++;
                }

                // 2. Movement Sheet
                var reportMoveSheet = reportWorkbook.Worksheets.Add("Movements (Enhanced)");
                reportMoveSheet.Cell(1, 1).Value = "Policy Number";
                reportMoveSheet.Cell(1, 2).Value = "Client Name";
                reportMoveSheet.Cell(1, 3).Value = "Movement Type";
                reportMoveSheet.Cell(1, 4).Value = "Effective Date";
                reportMoveSheet.Cell(1, 5).Value = "Premium";
                reportMoveSheet.Cell(1, 6).Value = "Category";
                reportMoveSheet.Cell(1, 7).Value = "Matched Advisor";
                reportMoveSheet.Cell(1, 8).Value = "Scan Date";
                reportMoveSheet.Cell(1, 9).Value = "Link to Scan";
                reportMoveSheet.Range("A1:I1").Style.Font.Bold = true;

                row = 2;
                foreach (var item in statement.MovementItems)
                {
                    reportMoveSheet.Cell(row, 1).Value = item.PolicyNumber;
                    reportMoveSheet.Cell(row, 2).Value = item.ClientName;
                    reportMoveSheet.Cell(row, 3).Value = item.MovementType;
                    reportMoveSheet.Cell(row, 4).Value = item.EffectiveDate?.ToString("yyyy-MM-dd") ?? "";
                    reportMoveSheet.Cell(row, 5).Value = item.Premium;
                    reportMoveSheet.Cell(row, 6).Value = item.Category;
                    reportMoveSheet.Cell(row, 7).Value = item.AdvisorName ?? "NOT MATCHED";
                    reportMoveSheet.Cell(row, 8).Value = item.MatchedSubmission?.CreatedAt.ToString("yyyy-MM-dd HH:mm") ?? "";
                    reportMoveSheet.Cell(row, 9).Value = item.GoogleDriveLink ?? "";
                    if (!string.IsNullOrEmpty(item.GoogleDriveLink))
                        reportMoveSheet.Cell(row, 9).SetHyperlink(new XLHyperlink(item.GoogleDriveLink));
                    row++;
                }

                reportCommSheet.Columns().AdjustToContents();
                reportMoveSheet.Columns().AdjustToContents();

                reportWorkbook.SaveAs(ms);
                ms.Position = 0;

                var reportFileName = $"Reconciliation_Report_{statement.StatementDate:yyyyMMdd}_{Guid.NewGuid().ToString().Substring(0, 8)}.xlsx";
                var storageKey = await _fileStorageService.UploadFileAsync(ms, reportFileName, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "reports");
                var reportUrl = await _fileStorageService.GetFileUrlAsync(storageKey);
                
                _logger.LogInformation("Successfully generated report and uploaded to storage: {Url}", reportUrl);
                statement.GoogleSheetUrl = reportUrl; 
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while generating or uploading Excel report");
        }

        _logger.LogInformation("Saving statement to database...");
        _context.CommissionStatements.Add(statement);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Statement saved successfully with ID: {Id}", statement.Id);

        return statement;
    }

    private string ExtractSurname(string fullName) => fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "";
    private string ExtractInitials(string fullName) 
    {
        var parts = fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length > 1 ? parts[1] : "";
    }

    private decimal ParseDecimal(string value)
    {
        if (string.IsNullOrEmpty(value)) return 0;
        
        // Remove currency symbols and all types of whitespace (including non-breaking spaces)
        var cleanValue = value.Replace("R", "").Replace("r", "").Trim();
        cleanValue = System.Text.RegularExpressions.Regex.Replace(cleanValue, @"\s+", "");

        if (string.IsNullOrEmpty(cleanValue)) return 0;

        // Handle common numeric formatting issues
        if (cleanValue.Contains(",") && !cleanValue.Contains("."))
        {
            // If only a comma exists, it's likely the decimal separator (e.g., "162,80")
            cleanValue = cleanValue.Replace(",", ".");
        }
        else if (cleanValue.Contains(",") && cleanValue.Contains("."))
        {
            // If both exist, the comma is a thousands separator (e.g., "1,234.56")
            cleanValue = cleanValue.Replace(",", "");
        }

        return decimal.TryParse(cleanValue, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var result) ? result : 0;
    }

    private Submission? FindMatch(string policyNumber, string clientName, List<Submission> submissions, out bool isPolicyMatch)
    {
        isPolicyMatch = false;
        if (!string.IsNullOrEmpty(policyNumber))
        {
            var match = submissions.FirstOrDefault(s => 
                !string.IsNullOrEmpty(s.PolicyNumber) && 
                s.PolicyNumber.Equals(policyNumber, StringComparison.OrdinalIgnoreCase));
            
            if (match != null)
            {
                isPolicyMatch = true;
                return match;
            }
        }

        if (!string.IsNullOrEmpty(clientName))
        {
            var parts = clientName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length > 0)
            {
                var surnameFromExcel = parts[0];
                var initialsFromExcel = parts.Length > 1 ? parts[1].Trim() : "";

                var match = submissions.FirstOrDefault(s =>
                {
                    if (!s.ApplicantSurname.Equals(surnameFromExcel, StringComparison.OrdinalIgnoreCase))
                        return false;

                    if (s.Initials.Equals(initialsFromExcel, StringComparison.OrdinalIgnoreCase))
                        return true;

                    if (s.Initials.Length >= 2 && initialsFromExcel.Length >= 2)
                    {
                        var sInit = s.Initials.ToUpper();
                        var eInit = initialsFromExcel.ToUpper();
                        var swappedEInit = new string(new[] { eInit[1], eInit[0] }) + (eInit.Length > 2 ? eInit.Substring(2) : "");
                        if (sInit.Equals(swappedEInit)) return true;
                    }

                    return false;
                });

                if (match != null) return match;
            }
        }

        return null;
    }
}
