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

        var allAdvisors = await _context.Advisors.ToListAsync();

        // Build fast O(1) Lookup Dictionaries
        var masterPolicyMap = masterPolicies
            .Where(p => !string.IsNullOrWhiteSpace(p.PolicyNumber))
            .GroupBy(p => p.PolicyNumber.Trim(), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var subPolicyMap = allSubmissions
            .Where(s => !string.IsNullOrWhiteSpace(s.PolicyNumber))
            .GroupBy(s => s.PolicyNumber.Trim(), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var subSurnameMap = allSubmissions
            .Where(s => !string.IsNullOrWhiteSpace(s.ApplicantSurname))
            .GroupBy(s => s.ApplicantSurname.Trim(), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.ToList(), StringComparer.OrdinalIgnoreCase);

        // 1. Process "Movement" Sheet FIRST (Priority for status and registration)
        var movementSheetNames = new[] { "Movement", "Movements", "Weekly Movement", "Movement Report" };
        if (TryFindWorksheet(workbook, movementSheetNames, out var moveSheet))
        {
            _logger.LogInformation("Processing 'Movement' worksheet '{SheetName}'...", moveSheet.Name);
            
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
                
                // Strict Verbatim Filtering: Only process First Year and Second Year Commission
                var isFirstYear = subType.Equals("First Year Commission", StringComparison.OrdinalIgnoreCase) || subType.Equals("First Year Commision", StringComparison.OrdinalIgnoreCase);
                var isSecondYear = subType.Equals("Second Year Commission", StringComparison.OrdinalIgnoreCase) || subType.Equals("Second Year Commision", StringComparison.OrdinalIgnoreCase);

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
                    Amount = amount,
                    EffectiveDate = row.Cell(dateCol).Value.IsDateTime ? row.Cell(dateCol).Value.GetDateTime().ToUniversalTime() : (DateTime?)null,
                    Category = category
                };

                // MATCHING & AUTO-REGISTRATION
                var pKey = policyNumber.Trim().ToUpperInvariant();
                masterPolicyMap.TryGetValue(pKey, out var masterMatch);
                if (masterMatch != null)
                {
                    moveItem.IsConfirmed = masterMatch.IsConfirmed;
                    moveItem.AdvisorName = string.Join(", ", masterMatch.Advisors.Select(a => a.Name));
                    
                    // Update premium and commission if available
                    if (premium > 0) masterMatch.Premium = premium;
                    masterMatch.LastCommissionAmount = amount;
                    masterMatch.LastUpdated = DateTime.UtcNow;

                    subPolicyMap.TryGetValue(pKey, out var subMatch);
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
                    else if (amount > 0 && moveItem.IsConfirmed)
                    {
                        if (subMatch != null) subMatch.Status = SubmissionStatus.Active;
                        masterMatch.Status = SubmissionStatus.Active;
                    }
                    statement.MatchedRows++;
                }
                else
                {
                    var subMatch = FindMatch(policyNumber, clientName, null, allSubmissions, allAdvisors, out bool isPolicyMatch, premium, null, subPolicyMap, subSurnameMap);
                    if (subMatch != null)
                    {
                        // Fallback for premium if statement is missing it
                        var finalPremium = premium > 0 ? premium : subMatch.Premium;

                        // AUTO-REGISTER into Master
                        var newMaster = new PolicyRecord
                        {
                            PolicyNumber = pKey,
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
                        masterPolicyMap[pKey] = newMaster; // Update map to avoid EF duplicate tracking errors

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
        var commSheetNames = new[] { "Commission Details", "Commission Detail", "Commissions", "Commission", "Commission_Details" };
        if (TryFindWorksheet(workbook, commSheetNames, out var commSheet))
        {
            _logger.LogInformation("Processing 'Commission Details' worksheet '{SheetName}'...", commSheet.Name);

            // Find columns dynamically
            var headerRow = commSheet.Row(1);
            int policyCol = 10, clientCol = 9, amountCol = 23, premCol = 12, typeCol = 2;
            int salesForceCol = -1, clawbackCol = -1, clawbackRetentionCol = -1, clawbackReasonCol = -1;
            int productCol = -1, captureDateCol = -1, commGrossCol = -1, commRetCol = -1;

            for (int c = 1; c <= headerRow.LastCellUsed().Address.ColumnNumber; c++)
            {
                var val = headerRow.Cell(c).Value.ToString().Replace(" ", "").Replace("(", "").Replace(")", "").ToLower();
                if (val.Contains("policynumber")) policyCol = c;
                else if (val.Contains("clientname")) clientCol = c;
                else if (val.Contains("product")) productCol = c;
                else if (val.Contains("capturedate") || val.Contains("datecaptured")) captureDateCol = c;
                else if (val.Contains("commissiongross") || (val.Contains("gross") && !val.Contains("clawback"))) commGrossCol = c;
                else if (val.Contains("commissionretention") || (val.Contains("retention") && !val.Contains("clawback"))) commRetCol = c;
                else if (val.Contains("nett") && !val.Contains("clawback")) amountCol = c;
                else if (val.Contains("premium") || val.Contains("prem")) premCol = c;
                else if (val.Contains("type") && val.Contains("commission") && !val.Contains("sub")) typeCol = c;
                else if (val.Contains("salesforcename") || (val.Contains("sales") && val.Contains("force"))) salesForceCol = c;
                else if (val.Contains("clawback") && val.Contains("gross")) clawbackCol = c;
                else if (val.Contains("clawback") && val.Contains("retention")) clawbackRetentionCol = c;
                else if (val.Contains("reason") || (val.Contains("clawback") && val.Contains("reason"))) clawbackReasonCol = c;
                else if (val.Contains("clawback") && clawbackCol == -1) clawbackCol = c;
            }

            // Fallback for Column X (24) if clawbackReasonCol was not matched by header name
            if (clawbackReasonCol == -1 && headerRow.LastCellUsed().Address.ColumnNumber >= 24)
            {
                clawbackReasonCol = 24;
            }

            _logger.LogInformation("CommDetails Columns: Policy={P}, Client={C}, Amount={A}, Premium={PR}, Type={T}, SalesForce={S}, Gross={CG}, CommRet={CR}, ClawBack={CB}, ClawBackRet={CBR}, ClawBackReason={CBRS}", policyCol, clientCol, amountCol, premCol, typeCol, salesForceCol, commGrossCol, commRetCol, clawbackCol, clawbackRetentionCol, clawbackReasonCol);

            var rows = commSheet.RowsUsed().Skip(1); 
            int commCount = 0;
            foreach (var row in rows)
            {
                var policyNumber = row.Cell(policyCol).Value.ToString().Trim();
                var clientName = row.Cell(clientCol).Value.ToString().Trim();

                if (string.IsNullOrEmpty(policyNumber) && string.IsNullOrEmpty(clientName)) continue;

                var subType = row.Cell(typeCol).Value.ToString().Trim();
                
                // Strict Verbatim Filtering: Process First Year Commission and Second Year Commission verbatim only
                var isFirstYear = subType.Equals("First Year Commission", StringComparison.OrdinalIgnoreCase) || subType.Equals("First Year Commision", StringComparison.OrdinalIgnoreCase);
                var isSecondYear = subType.Equals("Second Year Commission", StringComparison.OrdinalIgnoreCase) || subType.Equals("Second Year Commision", StringComparison.OrdinalIgnoreCase);

                if (!isFirstYear && !isSecondYear) 
                {
                    continue; // Skip non-commission types
                }

                commCount++;
                var amount = ParseDecimal(row.Cell(amountCol).Value.ToString());
                var premium = ParseDecimal(row.Cell(premCol).Value.ToString());
                
                var salesForceName = salesForceCol != -1 ? (string.IsNullOrWhiteSpace(row.Cell(salesForceCol).Value.ToString()) ? null : row.Cell(salesForceCol).Value.ToString().Trim()) : null;
                var product = productCol != -1 ? (string.IsNullOrWhiteSpace(row.Cell(productCol).Value.ToString()) ? null : row.Cell(productCol).Value.ToString().Trim()) : null;
                
                DateTime? captureDate = null;
                if (captureDateCol != -1)
                {
                    var cellStr = row.Cell(captureDateCol).Value.ToString();
                    if (!string.IsNullOrWhiteSpace(cellStr) && DateTime.TryParse(cellStr, out var parsedDt))
                    {
                        captureDate = DateTime.SpecifyKind(parsedDt, DateTimeKind.Utc);
                    }
                }

                var grossCommission = commGrossCol != -1 ? ParseDecimal(row.Cell(commGrossCol).Value.ToString()) : amount;
                var commissionRetention = commRetCol != -1 ? ParseDecimal(row.Cell(commRetCol).Value.ToString()) : 0;
                var clawBack = clawbackCol != -1 ? ParseDecimal(row.Cell(clawbackCol).Value.ToString()) : 0;
                var clawBackRetention = clawbackRetentionCol != -1 ? ParseDecimal(row.Cell(clawbackRetentionCol).Value.ToString()) : 0;
                var clawBackReason = clawbackReasonCol != -1 ? (string.IsNullOrWhiteSpace(row.Cell(clawbackReasonCol).Value.ToString()) ? null : row.Cell(clawbackReasonCol).Value.ToString().Trim()) : null;

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
                    Category = category,
                    SalesForceName = salesForceName,
                    Product = product,
                    CaptureDate = captureDate,
                    GrossCommission = grossCommission,
                    CommissionRetention = commissionRetention,
                    ClawBack = clawBack,
                    ClawBackRetention = clawBackRetention,
                    NettCommission = amount,
                    ClawBackReason = clawBackReason
                };

                // MATCHING & AUTO-REGISTRATION
                var pKey = policyNumber.Trim().ToUpperInvariant();
                masterPolicyMap.TryGetValue(pKey, out var masterMatch);
                if (masterMatch != null)
                {
                    item.IsConfirmed = masterMatch.IsConfirmed;
                    item.AdvisorName = string.Join(", ", masterMatch.Advisors.Select(a => a.Name));
                    
                    // Update premium and commission if available
                    if (premium > 0) masterMatch.Premium = premium;
                    masterMatch.LastCommissionAmount = amount;
                    masterMatch.LastUpdated = DateTime.UtcNow;
                    
                    subPolicyMap.TryGetValue(pKey, out var subMatch);
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
                    else if (amount > 0 && item.IsConfirmed)
                    {
                        if (subMatch != null) subMatch.Status = SubmissionStatus.Active;
                        masterMatch.Status = SubmissionStatus.Active;
                    }
                    statement.MatchedRows++;
                }
                else
                {
                    var subMatch = FindMatch(policyNumber, clientName, salesForceName, allSubmissions, allAdvisors, out bool isPolicyMatch, premium, null, subPolicyMap, subSurnameMap);
                    if (subMatch != null)
                    {
                        // Fallback for premium if statement is missing it
                        var finalPremium = premium > 0 ? premium : subMatch.Premium;

                        // AUTO-REGISTER into Master
                        var newMaster = new PolicyRecord
                        {
                            PolicyNumber = pKey,
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
                        masterPolicyMap[pKey] = newMaster; // Update map to avoid EF duplicate tracking errors

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
                    else if (!string.IsNullOrEmpty(salesForceName))
                    {
                        var matchingAdvisor = allAdvisors.FirstOrDefault(a => 
                            (!string.IsNullOrEmpty(a.SalesforceName) && a.SalesforceName.Equals(salesForceName, StringComparison.OrdinalIgnoreCase)) ||
                            (!string.IsNullOrEmpty(a.Name) && a.Name.Equals(salesForceName, StringComparison.OrdinalIgnoreCase))
                        );

                        if (matchingAdvisor != null)
                        {
                            item.AdvisorName = matchingAdvisor.Name;
                            item.IsConfirmed = false;
                        }
                    }
                }

                statement.Items.Add(item);
                statement.TotalCommission += item.Amount;
                statement.TotalRows++;
            }
            _logger.LogInformation("Processed {Count} relevant rows from Commission Details sheet.", commCount);
        }

        // Fallback: If no "Commission Details" items were loaded, but "Movement" items were loaded (e.g. Weekly Statement files),
        // populate statement.Items from statement.MovementItems so payslips & payouts generate properly.
        if (statement.Items.Count == 0 && statement.MovementItems.Count > 0)
        {
            _logger.LogInformation("No 'Commission Details' sheet items found. Fallback: Populating statement items from {Count} Movement items...", statement.MovementItems.Count);
            foreach (var m in statement.MovementItems)
            {
                var item = new StatementItem
                {
                    ClientName = m.ClientName,
                    PolicyNumber = m.PolicyNumber,
                    CommissionType = m.MovementType,
                    CommissionSubType = m.MovementType,
                    Amount = m.Amount,
                    Premium = m.Premium,
                    Category = m.Category,
                    AdvisorName = m.AdvisorName,
                    IsConfirmed = m.IsConfirmed,
                    MatchedSubmissionId = m.MatchedSubmissionId,
                    MatchedSubmission = m.MatchedSubmission,
                    FileUrl = m.FileUrl,
                    GoogleDriveLink = m.GoogleDriveLink,
                    GrossCommission = m.Amount,
                    NettCommission = m.Amount
                };

                statement.Items.Add(item);
                statement.TotalCommission += item.Amount;
                statement.TotalRows++;
            }
        }

        // 3. Process "Commission Not Payable" Sheet (Non-blocking extension)
        try
        {
            var unpayableSheetNames = new[] { "Commission Not Payable", "Commissions Not Payable", "Not Payable", "Unpayable" };
            if (TryFindWorksheet(workbook, unpayableSheetNames, out var unpayableSheet))
            {
                _logger.LogInformation("Processing 'Commission Not Payable' worksheet '{SheetName}'...", unpayableSheet.Name);
                var headerRow = unpayableSheet.Row(1);

                int policyCol = 1, clientCol = 5, reasonCol = 13, statusCol = 11, premCol = 10, premBalCol = 9;
                int policyIdCol = 2, mobileCol = 6, paymethodCol = 12, capturedCol = 7, inceptionCol = 8;

                for (int c = 1; c <= headerRow.LastCellUsed().Address.ColumnNumber; c++)
                {
                    var val = headerRow.Cell(c).Value.ToString().Replace(" ", "").Replace("(", "").Replace(")", "").ToLower();
                    if (val.Contains("policynumber")) policyCol = c;
                    else if (val.Contains("policyid")) policyIdCol = c;
                    else if (val.Contains("clientname")) clientCol = c;
                    else if (val.Contains("clientmobile") || val.Contains("mobile")) mobileCol = c;
                    else if (val.Contains("reason")) reasonCol = c;
                    else if (val.Contains("policystatus") || val.Contains("status")) statusCol = c;
                    else if (val.Contains("paymethod")) paymethodCol = c;
                    else if (val.Contains("premiumbalance") || val.Contains("balance")) premBalCol = c;
                    else if (val.Contains("premium") && !val.Contains("balance")) premCol = c;
                    else if (val.Contains("captured")) capturedCol = c;
                    else if (val.Contains("inception")) inceptionCol = c;
                }

                var rows = unpayableSheet.RowsUsed().Skip(1);
                int unpayableCount = 0;
                foreach (var row in rows)
                {
                    var policyNumber = row.Cell(policyCol).Value.ToString().Trim();
                    var clientName = row.Cell(clientCol).Value.ToString().Trim();

                    if (string.IsNullOrEmpty(policyNumber) && string.IsNullOrEmpty(clientName)) continue;

                    unpayableCount++;
                    var reason = reasonCol != -1 ? row.Cell(reasonCol).Value.ToString().Trim() : "Commission Not Payable";
                    var policyId = policyIdCol != -1 ? row.Cell(policyIdCol).Value.ToString().Trim() : null;
                    var mobile = mobileCol != -1 ? row.Cell(mobileCol).Value.ToString().Trim() : null;
                    var status = statusCol != -1 ? row.Cell(statusCol).Value.ToString().Trim() : null;
                    var paymethod = paymethodCol != -1 ? row.Cell(paymethodCol).Value.ToString().Trim() : null;
                    var premium = premCol != -1 ? ParseDecimal(row.Cell(premCol).Value.ToString()) : 0m;
                    var premiumBal = premBalCol != -1 ? ParseDecimal(row.Cell(premBalCol).Value.ToString()) : 0m;

                    DateTime? capturedDate = capturedCol != -1 && row.Cell(capturedCol).Value.IsDateTime ? row.Cell(capturedCol).Value.GetDateTime().ToUniversalTime() : null;
                    DateTime? inceptionDate = inceptionCol != -1 && row.Cell(inceptionCol).Value.IsDateTime ? row.Cell(inceptionCol).Value.GetDateTime().ToUniversalTime() : null;

                    var unpayableItem = new UnpayablePolicyItem
                    {
                        PolicyNumber = policyNumber,
                        PolicyId = policyId,
                        ClientName = clientName,
                        ClientMobile = mobile,
                        Premium = premium,
                        PremiumBalance = premiumBal,
                        Reason = string.IsNullOrEmpty(reason) ? "Commission Not Payable" : reason,
                        PolicyStatus = status,
                        Paymethod = paymethod,
                        CapturedDate = capturedDate,
                        InceptionDate = inceptionDate
                    };

                    // Match against submissions if possible
                    var subMatch = FindMatch(policyNumber, clientName, null, allSubmissions, allAdvisors, out _, premiumBal);
                    if (subMatch != null)
                    {
                        unpayableItem.MatchedSubmissionId = subMatch.Id;
                        unpayableItem.MatchedSubmission = subMatch;
                        unpayableItem.AdvisorName = string.Join(", ", subMatch.Advisors.Select(a => a.Name));
                    }

                    statement.UnpayableItems.Add(unpayableItem);
                }
                _logger.LogInformation("Processed {Count} rows from Commission Not Payable sheet.", unpayableCount);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to process Commission Not Payable sheet (non-blocking).");
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
                reportCommSheet.Cell(1, 9).Value = "Sales Force Name";
                reportCommSheet.Cell(1, 10).Value = "ClawBack";
                reportCommSheet.Cell(1, 11).Value = "ClawBack (Retention)";
                reportCommSheet.Cell(1, 12).Value = "ClawBack Reason";
                reportCommSheet.Cell(1, 13).Value = "Scan Date";
                reportCommSheet.Cell(1, 14).Value = "Link to Scan";
                reportCommSheet.Range("A1:N1").Style.Font.Bold = true;

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
                    reportCommSheet.Cell(row, 9).Value = item.SalesForceName ?? "";
                    reportCommSheet.Cell(row, 10).Value = item.ClawBack;
                    reportCommSheet.Cell(row, 11).Value = item.ClawBackRetention;
                    reportCommSheet.Cell(row, 12).Value = item.ClawBackReason ?? "";
                    reportCommSheet.Cell(row, 13).Value = item.MatchedSubmission?.CreatedAt.ToString("yyyy-MM-dd HH:mm") ?? "";
                    reportCommSheet.Cell(row, 14).Value = item.GoogleDriveLink ?? "";
                    if (!string.IsNullOrEmpty(item.GoogleDriveLink))
                        reportCommSheet.Cell(row, 14).SetHyperlink(new XLHyperlink(item.GoogleDriveLink));
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

    private Submission? FindMatch(
        string policyNumber, 
        string clientName, 
        string? salesForceName, 
        List<Submission> submissions, 
        List<Advisor> advisors, 
        out bool isPolicyMatch,
        decimal premium = 0,
        string? idNumber = null,
        Dictionary<string, Submission>? subPolicyMap = null,
        Dictionary<string, List<Submission>>? subSurnameMap = null)
    {
        isPolicyMatch = false;

        // 1. Exact Policy Number Match (O(1) Dictionary lookup or fallback)
        if (!string.IsNullOrEmpty(policyNumber))
        {
            var pKey = policyNumber.Trim();
            if (subPolicyMap != null)
            {
                if (subPolicyMap.TryGetValue(pKey, out var match))
                {
                    isPolicyMatch = true;
                    return match;
                }
            }
            else
            {
                var matchFallback = submissions.FirstOrDefault(s => 
                    !string.IsNullOrEmpty(s.PolicyNumber) && 
                    s.PolicyNumber.Equals(policyNumber, StringComparison.OrdinalIgnoreCase));
                if (matchFallback != null)
                {
                    isPolicyMatch = true;
                    return matchFallback;
                }
            }
        }

        if (string.IsNullOrWhiteSpace(clientName) && string.IsNullOrWhiteSpace(idNumber))
            return null;

        // 2. Identify potential Salesforce / Advisor match if provided
        Advisor? matchingAdvisor = null;
        if (!string.IsNullOrEmpty(salesForceName))
        {
            matchingAdvisor = advisors.FirstOrDefault(a => 
                (!string.IsNullOrEmpty(a.SalesforceName) && a.SalesforceName.Equals(salesForceName, StringComparison.OrdinalIgnoreCase)) ||
                (!string.IsNullOrEmpty(a.Name) && a.Name.Equals(salesForceName, StringComparison.OrdinalIgnoreCase))
            );
        }

        // Smart Client Name Parsing
        var (surnameFromExcel, initialsFromExcel, fullFirstFromExcel) = ParseClientName(clientName);

        // Filter candidate submissions using Surname Map if available to avoid scanning 50,000 items
        IEnumerable<Submission> candidatesPool;
        if (subSurnameMap != null)
        {
            if (!string.IsNullOrWhiteSpace(surnameFromExcel) && subSurnameMap.TryGetValue(surnameFromExcel.Trim(), out var matchedCandidates))
            {
                candidatesPool = matchedCandidates;
            }
            else
            {
                candidatesPool = Enumerable.Empty<Submission>();
            }
        }
        else
        {
            candidatesPool = submissions;
        }

        // Candidates evaluation using Weighted Scoring
        var candidates = new List<(Submission submission, double score)>();

        foreach (var sub in candidatesPool)
        {
            double score = 0;

            // --- ID Number Check ---
            if (!string.IsNullOrEmpty(idNumber) && !string.IsNullOrEmpty(sub.IdNumber))
            {
                if (sub.IdNumber.Trim().Equals(idNumber.Trim(), StringComparison.OrdinalIgnoreCase))
                {
                    score += 100; // Strong ID match
                }
            }

            // --- Surname Matching ---
            bool surnameMatched = false;
            if (!string.IsNullOrEmpty(surnameFromExcel) && !string.IsNullOrEmpty(sub.ApplicantSurname))
            {
                var subSurname = sub.ApplicantSurname.Trim();
                if (subSurname.Equals(surnameFromExcel, StringComparison.OrdinalIgnoreCase))
                {
                    surnameMatched = true;
                    score += 40;
                }
                else if (subSurname.Contains(surnameFromExcel, StringComparison.OrdinalIgnoreCase) ||
                         surnameFromExcel.Contains(subSurname, StringComparison.OrdinalIgnoreCase))
                {
                    surnameMatched = true;
                    score += 25; // Partial/Compound surname match (e.g., Mthimkhulu-Dlamini)
                }
            }

            // If surname didn't match at all and ID didn't match, this submission is not a candidate
            if (!surnameMatched && score < 50)
                continue;

            // --- Initials / First Name Matching ---
            if (!string.IsNullOrEmpty(sub.Initials))
            {
                var cleanSubInit = CleanInitials(sub.Initials);
                var cleanExcelInit = CleanInitials(initialsFromExcel);

                if (!string.IsNullOrEmpty(cleanExcelInit) && cleanSubInit.Equals(cleanExcelInit, StringComparison.OrdinalIgnoreCase))
                {
                    score += 30; // Exact initials match
                }
                else if (cleanSubInit.Length >= 2 && cleanExcelInit.Length >= 2 && SwappedInitialsMatch(cleanSubInit, cleanExcelInit))
                {
                    score += 25; // Swapped initials (e.g. MJ vs JM)
                }
                else if (!string.IsNullOrEmpty(fullFirstFromExcel) && fullFirstFromExcel.StartsWith(cleanSubInit, StringComparison.OrdinalIgnoreCase))
                {
                    score += 20; // Full name starts with initial
                }
                else if (!string.IsNullOrEmpty(cleanSubInit) && !string.IsNullOrEmpty(cleanExcelInit) &&
                         cleanSubInit.Substring(0, 1).Equals(cleanExcelInit.Substring(0, 1), StringComparison.OrdinalIgnoreCase))
                {
                    score += 15; // First initial letter matches
                }
            }

            // --- Advisor Alignment ---
            if (matchingAdvisor != null)
            {
                if (sub.Advisors.Any(a => a.Id == matchingAdvisor.Id))
                {
                    score += 35; // Matches the advisor specified in the statement
                }
            }

            // --- Premium Alignment ---
            if (premium > 0 && sub.Premium > 0)
            {
                var diff = Math.Abs(sub.Premium - premium);
                if (diff < 0.01m)
                {
                    score += 25; // Exact premium match
                }
                else if (diff <= 5.00m)
                {
                    score += 10; // Close premium match
                }
            }

            if (score >= 40)
            {
                candidates.Add((sub, score));
            }
        }

        if (!candidates.Any())
            return null;

        // Pick candidate with the highest score
        var bestMatch = candidates.OrderByDescending(c => c.score).ThenByDescending(c => c.submission.CreatedAt).FirstOrDefault();
        
        return bestMatch.submission;
    }

    private (string surname, string initials, string fullFirst) ParseClientName(string clientName)
    {
        if (string.IsNullOrWhiteSpace(clientName)) return ("", "", "");

        var clean = clientName.Trim();
        var parts = clean.Split(' ', StringSplitOptions.RemoveEmptyEntries);

        if (parts.Length == 1)
        {
            return (parts[0], "", "");
        }

        // Check for common compound surname prefixes
        var prefixes = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "van", "de", "der", "von", "du", "le", "la" };
        
        if (parts.Length >= 3 && prefixes.Contains(parts[0]))
        {
            var compoundSurname = $"{parts[0]} {parts[1]}";
            var init = parts[2];
            var full = parts.Length > 2 ? string.Join(" ", parts.Skip(2)) : "";
            return (compoundSurname, init, full);
        }

        var surname = parts[0];
        var initials = parts[1];
        var fullFirst = string.Join(" ", parts.Skip(1));

        return (surname, initials, fullFirst);
    }

    private string CleanInitials(string initials)
    {
        if (string.IsNullOrWhiteSpace(initials)) return "";
        return System.Text.RegularExpressions.Regex.Replace(initials, @"[\.\s\-_]", "").ToUpper();
    }

    private bool SwappedInitialsMatch(string init1, string init2)
    {
        if (init1.Length < 2 || init2.Length < 2) return false;
        var swapped = new string(new[] { init2[1], init2[0] }) + (init2.Length > 2 ? init2.Substring(2) : "");
        return init1.Equals(swapped, StringComparison.OrdinalIgnoreCase);
    }

    private static bool TryFindWorksheet(XLWorkbook workbook, string[] candidateNames, out IXLWorksheet sheet)
    {
        sheet = null!;
        foreach (var name in candidateNames)
        {
            if (workbook.Worksheets.TryGetWorksheet(name, out sheet))
                return true;
        }
        foreach (var ws in workbook.Worksheets)
        {
            var wsName = ws.Name.Trim().ToLower();
            foreach (var candidate in candidateNames)
            {
                var candClean = candidate.Trim().ToLower();
                if (wsName.Equals(candClean) || wsName.Contains(candClean) || candClean.Contains(wsName))
                {
                    sheet = ws;
                    return true;
                }
            }
        }
        return false;
    }
}
