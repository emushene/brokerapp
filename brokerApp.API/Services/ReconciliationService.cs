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

    public ReconciliationService(ApplicationDbContext context, ILogger<ReconciliationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<CommissionStatement> ProcessStatementAsync(Stream fileStream, string fileName, DateTime statementDate, string? fileUrl = null)
    {
        using var workbook = new XLWorkbook(fileStream);
        
        var statement = new CommissionStatement
        {
            FileName = fileName,
            FileUrl = fileUrl,
            StatementDate = statementDate.ToUniversalTime(),
            UploadDate = DateTime.UtcNow
        };

        // Important: Include Advisors and Documents to see who "owns" the policy and where the scans are
        var allSubmissions = await _context.Submissions
            .Include(s => s.Advisors)
            .Include(s => s.Documents)
            .ToListAsync();

        // 1. Process "Commission Details" Sheet
        if (workbook.Worksheets.TryGetWorksheet("Commission Details", out var commSheet))
        {
            var rows = commSheet.RowsUsed().Skip(1); 
            foreach (var row in rows)
            {
                var amount = decimal.TryParse(row.Cell(23).Value.ToString(), out var amt) ? amt : 0;
                var premium = decimal.TryParse(row.Cell(21).Value.ToString(), out var p) ? p : 0; // Assuming Col 21 is Premium
                var subType = row.Cell(3).Value.ToString();
                
                var category = "Unknown";
                if (amount < 0) category = "Lapse";
                else if (subType.Contains("1st", StringComparison.OrdinalIgnoreCase)) category = "First Year";
                else if (subType.Contains("2nd", StringComparison.OrdinalIgnoreCase)) category = "Second Year";
                else category = "Renewal";

                var item = new StatementItem
                {
                    ClientName = row.Cell(9).Value.ToString(),
                    PolicyNumber = row.Cell(10).Value.ToString(),
                    CommissionType = row.Cell(2).Value.ToString(),
                    CommissionSubType = subType,
                    Amount = amount,
                    Premium = premium,
                    Category = category
                };

                var match = FindMatch(item.PolicyNumber, item.ClientName, allSubmissions);
                if (match != null)
                {
                    item.MatchedSubmissionId = match.Id;
                    item.AdvisorName = string.Join(", ", match.Advisors.Select(a => a.Name));
                    
                    var latestDoc = match.Documents.OrderByDescending(d => d.DateModified).FirstOrDefault();
                    item.GoogleDriveLink = latestDoc?.FileUrl;
                    item.FileUrl = latestDoc?.FileUrl;
                    
                    statement.MatchedRows++;

                    // AUTO-LAPSE: If it's a lapse, update the actual submission status
                    if (category == "Lapse")
                    {
                        match.Status = SubmissionStatus.Lapsed;
                        _context.Submissions.Update(match);
                    }
                }

                statement.Items.Add(item);
                statement.TotalCommission += item.Amount;
                statement.TotalRows++;
            }
        }

        // 2. Process "Movement" Sheet
        if (workbook.Worksheets.TryGetWorksheet("Movement", out var moveSheet))
        {
            var rows = moveSheet.RowsUsed().Skip(1);
            foreach (var row in rows)
            {
                var prem = decimal.TryParse(row.Cell(8).Value.ToString(), out var p) ? p : 0;
                var moveType = row.Cell(15).Value.ToString();
                
                var category = "Movement";
                if (prem < 0 || moveType.Contains("Lapse", StringComparison.OrdinalIgnoreCase)) category = "Lapse";

                var moveItem = new MovementItem
                {
                    ClientName = row.Cell(5).Value.ToString(),
                    PolicyNumber = row.Cell(6).Value.ToString(),
                    MovementType = moveType,
                    Premium = prem,
                    EffectiveDate = row.Cell(12).Value.IsDateTime ? row.Cell(12).Value.GetDateTime().ToUniversalTime() : (DateTime?)null,
                    Category = category
                };

                var match = FindMatch(moveItem.PolicyNumber, moveItem.ClientName, allSubmissions);
                if (match != null)
                {
                    moveItem.MatchedSubmissionId = match.Id;
                    moveItem.AdvisorName = string.Join(", ", match.Advisors.Select(a => a.Name));

                    var latestDoc = match.Documents.OrderByDescending(d => d.DateModified).FirstOrDefault();
                    moveItem.GoogleDriveLink = latestDoc?.FileUrl;
                    moveItem.FileUrl = latestDoc?.FileUrl;
                    
                    statement.MatchedRows++; // Increment matched rows for movements too

                    if (category == "Lapse")
                    {
                        match.Status = SubmissionStatus.Lapsed;
                        _context.Submissions.Update(match);
                    }
                }

                statement.MovementItems.Add(moveItem);
            }
        }

        _context.CommissionStatements.Add(statement);
        await _context.SaveChangesAsync();

        return statement;
    }

    private Submission? FindMatch(string policyNumber, string clientName, List<Submission> submissions)
    {
        if (!string.IsNullOrEmpty(policyNumber))
        {
            var match = submissions.FirstOrDefault(s => 
                !string.IsNullOrEmpty(s.PolicyNumber) && 
                s.PolicyNumber.Equals(policyNumber, StringComparison.OrdinalIgnoreCase));
            
            if (match != null) return match;
        }

        if (!string.IsNullOrEmpty(clientName))
        {
            var parts = clientName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length > 0)
            {
                var surnameFromExcel = parts[0];
                var initialsFromExcel = parts.Length > 1 ? parts[1].Trim() : "";

                return submissions.FirstOrDefault(s =>
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
            }
        }

        return null;
    }
}
