using brokerApp.API.Data;
using brokerApp.API.DTOs;
using brokerApp.API.Models;
using brokerApp.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace brokerApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FinancialsController : ControllerBase
{
    private readonly IFinancialsService _financialsService;
    private readonly IReconciliationService _reconciliationService;
    private readonly IFileStorageService _fileStorageService;
    private readonly IGoogleSheetsService _sheetsService;
    private readonly IPdfService _pdfService;
    private readonly ApplicationDbContext _context;

    public FinancialsController(
        IFinancialsService financialsService, 
        IReconciliationService reconciliationService,
        IFileStorageService fileStorageService,
        IGoogleSheetsService sheetsService,
        IPdfService pdfService,
        ApplicationDbContext context)
    {
        _financialsService = financialsService;
        _reconciliationService = reconciliationService;
        _fileStorageService = fileStorageService;
        _sheetsService = sheetsService;
        _pdfService = pdfService;
        _context = context;
    }

    [HttpPost("import-statement")]
    public async Task<IActionResult> ImportStatement(IFormFile file, [FromForm] DateTime statementDate)
    {
        if (file == null || file.Length == 0) return BadRequest("No file uploaded");

        try
        {
            var normalizedDate = DateTime.SpecifyKind(statementDate.Date, DateTimeKind.Utc);
            var existing = await _context.CommissionStatements
                .FirstOrDefaultAsync(s => s.FileName == file.FileName && s.StatementDate == normalizedDate);

            if (existing != null)
            {
                return Ok(existing);
            }

            string? fileUrl = null;
            using (var uploadStream = file.OpenReadStream())
            {
                fileUrl = await _fileStorageService.UploadFileAsync(uploadStream, file.FileName, file.ContentType);
            }

            using (var processStream = file.OpenReadStream())
            {
                var result = await _reconciliationService.ProcessStatementAsync(processStream, file.FileName, statementDate, fileUrl);
                return Ok(result);
            }
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("statements")]
    public async Task<IActionResult> GetStatements()
    {
        var statements = await _context.CommissionStatements
            .OrderByDescending(s => s.UploadDate)
            .Select(s => new {
                s.Id,
                s.FileName,
                s.FileUrl,
                s.GoogleSheetUrl,
                s.StatementDate,
                s.UploadDate,
                s.TotalCommission,
                s.TotalRows,
                s.MatchedRows
            })
            .ToListAsync();
        
        return Ok(statements);
    }

    [HttpGet("statements/{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetStatementDetails(int id)
    {
        var statement = await _context.CommissionStatements
            .AsSplitQuery()
            .AsNoTracking()
            .Include(s => s.Items)
                .ThenInclude(i => i.MatchedSubmission)
                    .ThenInclude(sub => sub!.Advisors)
            .Include(s => s.MovementItems)
                .ThenInclude(m => m.MatchedSubmission)
                    .ThenInclude(sub => sub!.Advisors)
            .Include(s => s.UnpayableItems)
                .ThenInclude(u => u.MatchedSubmission)
                    .ThenInclude(sub => sub!.Advisors)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (statement == null) return NotFound();
        return Ok(statement);
    }

    [HttpDelete("statements/{id}")]
    public async Task<IActionResult> DeleteStatement(int id)
    {
        var statement = await _context.CommissionStatements.FindAsync(id);
        if (statement == null) return NotFound();

        try
        {
            // 1. Delete from Google Drive if URL exists
            if (!string.IsNullOrEmpty(statement.GoogleSheetUrl))
            {
                await _sheetsService.DeleteSheetAsync(statement.GoogleSheetUrl);
            }

            // 2. Delete from GCP Storage if URL exists
            if (!string.IsNullOrEmpty(statement.FileUrl))
            {
                // Note: FileUrl might be a full URL, we need the storage key (filename)
                // The GoogleCloudStorageService implementation uses the filename as key
                // but for safety, we'd ideally store the storage key separately.
                // For now, we'll try to extract it.
                var storageKey = Path.GetFileName(new Uri(statement.FileUrl).AbsolutePath);
                try { await _fileStorageService.DeleteFileAsync(storageKey); } catch { /* Ignore if file not found */ }
            }

            // 3. Delete from DB (Cascading handles items)
            _context.CommissionStatements.Remove(statement);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Statement and associated files deleted successfully." });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("statements/{id}/conclude")]
    public async Task<IActionResult> ConcludeStatement(int id)
    {
        try
        {
            await _financialsService.ConcludeStatementAsync(id);
            return Ok(new { message = "Commission run concluded. Pay slips are now available to advisors." });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("advisors/{advisorId}/payslips")]
    public async Task<IActionResult> GetAdvisorPayslips(int advisorId)
    {
        // Get all concluded statements that have commissions for this advisor
        var statementIds = await _context.AdvisorCommissions
            .Where(c => c.AdvisorId == advisorId && c.CommissionStatementId.HasValue)
            .Select(c => c.CommissionStatementId!.Value)
            .Distinct()
            .ToListAsync();

        var payslips = await _context.CommissionStatements
            .Where(s => statementIds.Contains(s.Id) && s.Status != "Draft")
            .OrderByDescending(s => s.StatementDate)
            .Select(s => new {
                s.Id,
                s.FileName,
                s.StatementDate,
                s.Status,
                TotalAmount = _context.AdvisorCommissions
                    .Where(c => c.AdvisorId == advisorId && c.CommissionStatementId == s.Id)
                    .Sum(c => c.CommissionAmount)
            })
            .ToListAsync();

        return Ok(payslips);
    }

    [HttpGet("advisors/{advisorId}/payslips/{statementId}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPayslipDetails(int advisorId, int statementId)
    {
        var statement = await _context.CommissionStatements.FindAsync(statementId);
        if (statement == null) return NotFound();

        var commissions = await _context.AdvisorCommissions
            .Include(c => c.Submission)
            .Where(c => c.AdvisorId == advisorId && c.CommissionStatementId == statementId)
            .ToListAsync();

        return Ok(new {
            Statement = new {
                statement.Id,
                statement.FileName,
                statement.StatementDate,
                statement.Status
            },
            Commissions = commissions.Select(c => new {
                c.Id,
                c.CommissionAmount,
                c.PayoutReference,
                ClientName = c.Submission?.ApplicantSurname + " " + c.Submission?.Initials,
                c.DateCalculated
            })
        });
    }

    [HttpGet("statements/{id}/payslips")]
    public async Task<IActionResult> GetStatementPayslips(int id)
    {
        var statement = await _context.CommissionStatements.FindAsync(id);
        if (statement == null) return NotFound();

        var allCommissions = await _context.AdvisorCommissions
            .Include(c => c.Advisor)
            .Include(c => c.Submission)
            .Where(c => c.CommissionStatementId == id)
            .ToListAsync();

        var statementItemPremiums = await _context.StatementItems
            .Where(si => si.CommissionStatementId == id && si.Premium > 0)
            .GroupBy(si => si.PolicyNumber)
            .ToDictionaryAsync(g => g.Key, g => g.First().Premium);

        var movementItemPremiums = await _context.MovementItems
            .Where(mi => mi.CommissionStatementId == id && mi.Premium > 0)
            .GroupBy(mi => mi.PolicyNumber)
            .ToDictionaryAsync(g => g.Key, g => g.First().Premium);

        var statementItemsDict = await _context.StatementItems
            .Where(si => si.CommissionStatementId == id)
            .GroupBy(si => si.PolicyNumber)
            .ToDictionaryAsync(g => g.Key, g => g.First());

        var grouped = allCommissions.GroupBy(c => c.AdvisorId)
            .Select(g => new {
                Advisor = new {
                    Id = g.Key,
                    Name = g.First().Advisor.Name,
                    Code = g.First().Advisor.Code,
                    Email = g.First().Advisor.Email
                },
                TotalAmount = g.Sum(c => c.CommissionAmount),
                TotalGross = g.Sum(c => c.GrossCommission),
                TotalRetention = g.Sum(c => c.CommissionRetention),
                TotalClawbackGross = g.Sum(c => c.ClawBackGross),
                TotalClawbackRetention = g.Sum(c => c.ClawBackRetention),
                Commissions = g.Select(c => {
                    var polNo = c.Submission?.PolicyNumber ?? "";
                    if (string.IsNullOrEmpty(polNo) && !string.IsNullOrEmpty(c.PayoutReference))
                    {
                        var parts = c.PayoutReference.Split(" - ");
                        if (parts.Length > 1) polNo = parts.Last().Replace("(Direct)", "").Trim();
                    }

                    statementItemsDict.TryGetValue(polNo, out var matchedSi);

                    decimal prem = 0m;
                    if (c.Submission != null && c.Submission.Premium > 0) prem = c.Submission.Premium;
                    else if (!string.IsNullOrEmpty(polNo) && statementItemPremiums.TryGetValue(polNo, out var p1)) prem = p1;
                    else if (!string.IsNullOrEmpty(polNo) && movementItemPremiums.TryGetValue(polNo, out var p2)) prem = p2;
                    else if (c.GrossCommission > 0) prem = c.GrossCommission;

                    var retention = c.CommissionRetention > 0 ? c.CommissionRetention : (matchedSi?.CommissionRetention ?? 0m);
                    if (retention == 0 && c.GrossCommission > 0 && c.SplitPercentage > 0 && c.SplitPercentage < 100)
                    {
                        retention = Math.Round(c.GrossCommission * (100m - c.SplitPercentage) / 100m, 2);
                    }
                    if (retention == 0 && c.GrossCommission > c.CommissionAmount && c.GrossCommission > 0)
                    {
                        retention = Math.Max(0m, c.GrossCommission - c.CommissionAmount - Math.Abs(c.ClawBackGross));
                    }

                    var cbRetention = c.ClawBackRetention != 0 ? c.ClawBackRetention : (matchedSi?.ClawBackRetention ?? 0m);
                    if (cbRetention == 0 && c.ClawBackGross != 0 && c.SplitPercentage > 0 && c.SplitPercentage < 100)
                    {
                        cbRetention = Math.Round(Math.Abs(c.ClawBackGross) * (100m - c.SplitPercentage) / 100m, 2);
                    }

                    var gross = c.GrossCommission > 0 ? c.GrossCommission : (matchedSi?.GrossCommission ?? (c.CommissionAmount + retention + Math.Abs(c.ClawBackGross) - cbRetention));

                    return new {
                        c.Id,
                        c.CommissionAmount,
                        GrossCommission = gross,
                        CommissionRetention = retention,
                        c.ClawBackGross,
                        ClawBackRetention = cbRetention,
                        c.NettCommission,
                        c.Product,
                        c.CaptureDate,
                        c.ClawBackReason,
                        c.SplitPercentage,
                        c.PayoutReference,
                        ClientName = !string.IsNullOrEmpty(c.Submission?.ApplicantSurname) 
                            ? c.Submission.ApplicantSurname + " " + c.Submission.Initials 
                            : (matchedSi?.ClientName ?? (c.PayoutReference ?? "N/A")),
                        PolicyNumber = string.IsNullOrEmpty(polNo) ? "N/A" : polNo,
                        Premium = prem,
                        c.DateCalculated
                    };
                })
            })
            .OrderBy(x => x.Advisor.Name)
            .ToList();

        return Ok(new {
            Statement = new {
                statement.Id,
                statement.FileName,
                statement.StatementDate,
                statement.Status
            },
            Payslips = grouped
        });
    }

    [HttpGet("advisors/{advisorId}/payslips/{statementId}/pdf")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPayslipPdf(int advisorId, int statementId)
    {
        var statement = await _context.CommissionStatements.FindAsync(statementId);
        if (statement == null) return NotFound("Statement not found");

        var statementItemPremiums = await _context.StatementItems
            .Where(si => si.CommissionStatementId == statementId && si.Premium > 0)
            .GroupBy(si => si.PolicyNumber)
            .ToDictionaryAsync(g => g.Key, g => g.First().Premium);

        var movementItemPremiums = await _context.MovementItems
            .Where(mi => mi.CommissionStatementId == statementId && mi.Premium > 0)
            .GroupBy(mi => mi.PolicyNumber)
            .ToDictionaryAsync(g => g.Key, g => g.First().Premium);

        var advisor = await _context.Advisors.FindAsync(advisorId);
        if (advisor == null) return NotFound("Advisor not found");

        var commissions = await _context.AdvisorCommissions
            .Include(c => c.Submission)
            .Where(c => c.AdvisorId == advisorId && c.CommissionStatementId == statementId)
            .ToListAsync();

        var statementItemsDict = await _context.StatementItems
            .Where(si => si.CommissionStatementId == statementId)
            .GroupBy(si => si.PolicyNumber)
            .ToDictionaryAsync(g => g.Key, g => g.First());

        var items = commissions.Select(c => {
            var polNo = c.Submission?.PolicyNumber ?? "";
            if (string.IsNullOrEmpty(polNo) && !string.IsNullOrEmpty(c.PayoutReference))
            {
                var parts = c.PayoutReference.Split(" - ");
                if (parts.Length > 1) polNo = parts.Last().Replace("(Direct)", "").Trim();
            }

            statementItemsDict.TryGetValue(polNo, out var matchedSi);

            decimal prem = 0m;
            if (c.Submission != null && c.Submission.Premium > 0) prem = c.Submission.Premium;
            else if (!string.IsNullOrEmpty(polNo) && statementItemPremiums.TryGetValue(polNo, out var p1)) prem = p1;
            else if (!string.IsNullOrEmpty(polNo) && movementItemPremiums.TryGetValue(polNo, out var p2)) prem = p2;
            else if (c.GrossCommission > 0) prem = c.GrossCommission;

            var retention = c.CommissionRetention > 0 ? c.CommissionRetention : (matchedSi?.CommissionRetention ?? 0m);
            if (retention == 0 && c.GrossCommission > 0 && c.SplitPercentage > 0 && c.SplitPercentage < 100)
            {
                retention = Math.Round(c.GrossCommission * (100m - c.SplitPercentage) / 100m, 2);
            }
            if (retention == 0 && c.GrossCommission > c.CommissionAmount && c.GrossCommission > 0)
            {
                retention = Math.Max(0m, c.GrossCommission - c.CommissionAmount - Math.Abs(c.ClawBackGross));
            }

            var cbRetention = c.ClawBackRetention != 0 ? c.ClawBackRetention : (matchedSi?.ClawBackRetention ?? 0m);
            if (cbRetention == 0 && c.ClawBackGross != 0 && c.SplitPercentage > 0 && c.SplitPercentage < 100)
            {
                cbRetention = Math.Round(Math.Abs(c.ClawBackGross) * (100m - c.SplitPercentage) / 100m, 2);
            }

            var gross = c.GrossCommission > 0 ? c.GrossCommission : (matchedSi?.GrossCommission ?? (c.CommissionAmount + retention + Math.Abs(c.ClawBackGross) - cbRetention));

            return new PayslipItemDto
            {
                ClientName = !string.IsNullOrEmpty(c.Submission?.ApplicantSurname) 
                    ? c.Submission.ApplicantSurname + " " + c.Submission.Initials 
                    : (matchedSi?.ClientName ?? (c.PayoutReference ?? "N/A")),
                PolicyNumber = string.IsNullOrEmpty(polNo) ? "N/A" : polNo,
                Product = c.Product ?? "",
                CaptureDate = c.CaptureDate,
                Premium = prem,
                GrossCommission = gross,
                CommissionRetention = retention,
                ClawBackGross = c.ClawBackGross,
                ClawBackRetention = cbRetention,
                CommissionAmount = c.CommissionAmount,
                PayoutReference = c.PayoutReference ?? ""
            };
        }).ToList();

        var pdfBytes = _pdfService.GenerateAdvisorPayslipPdf(
            advisor.Name,
            advisor.Code,
            advisor.Email,
            statement.FileName,
            statement.StatementDate,
            items);

        var safeAdvisorName = string.Concat(advisor.Name.Split(Path.GetInvalidFileNameChars())).Replace(" ", "_");
        return File(pdfBytes, "application/pdf", $"Payslip_{safeAdvisorName}_{statement.FileName}.pdf");
    }

    [HttpGet("statements/{id}/payslips/pdf")]
    public async Task<IActionResult> GetStatementPayslipsPdf(int id)
    {
        var statement = await _context.CommissionStatements.FindAsync(id);
        if (statement == null) return NotFound("Statement not found");

        var statementItemPremiums = await _context.StatementItems
            .Where(si => si.CommissionStatementId == id && si.Premium > 0)
            .GroupBy(si => si.PolicyNumber)
            .ToDictionaryAsync(g => g.Key, g => g.First().Premium);

        var movementItemPremiums = await _context.MovementItems
            .Where(mi => mi.CommissionStatementId == id && mi.Premium > 0)
            .GroupBy(mi => mi.PolicyNumber)
            .ToDictionaryAsync(g => g.Key, g => g.First().Premium);

        var allCommissions = await _context.AdvisorCommissions
            .Include(c => c.Advisor)
            .Include(c => c.Submission)
            .Where(c => c.CommissionStatementId == id)
            .ToListAsync();

        var statementItemsDict = await _context.StatementItems
            .Where(si => si.CommissionStatementId == id)
            .GroupBy(si => si.PolicyNumber)
            .ToDictionaryAsync(g => g.Key, g => g.First());

        var grouped = allCommissions.GroupBy(c => c.AdvisorId)
            .Select(g => new GroupedPayslipDto
            {
                AdvisorName = g.First().Advisor.Name,
                AdvisorCode = g.First().Advisor.Code,
                AdvisorEmail = g.First().Advisor.Email,
                Items = g.Select(c => {
                    var polNo = c.Submission?.PolicyNumber ?? "";
                    if (string.IsNullOrEmpty(polNo) && !string.IsNullOrEmpty(c.PayoutReference))
                    {
                        var parts = c.PayoutReference.Split(" - ");
                        if (parts.Length > 1) polNo = parts.Last().Replace("(Direct)", "").Trim();
                    }

                    statementItemsDict.TryGetValue(polNo, out var matchedSi);

                    decimal prem = 0m;
                    if (c.Submission != null && c.Submission.Premium > 0) prem = c.Submission.Premium;
                    else if (!string.IsNullOrEmpty(polNo) && statementItemPremiums.TryGetValue(polNo, out var p1)) prem = p1;
                    else if (!string.IsNullOrEmpty(polNo) && movementItemPremiums.TryGetValue(polNo, out var p2)) prem = p2;
                    else if (c.GrossCommission > 0) prem = c.GrossCommission;

                    var retention = c.CommissionRetention > 0 ? c.CommissionRetention : (matchedSi?.CommissionRetention ?? 0m);
                    if (retention == 0 && c.GrossCommission > 0 && c.SplitPercentage > 0 && c.SplitPercentage < 100)
                    {
                        retention = Math.Round(c.GrossCommission * (100m - c.SplitPercentage) / 100m, 2);
                    }
                    if (retention == 0 && c.GrossCommission > c.CommissionAmount && c.GrossCommission > 0)
                    {
                        retention = Math.Max(0m, c.GrossCommission - c.CommissionAmount - Math.Abs(c.ClawBackGross));
                    }

                    var cbRetention = c.ClawBackRetention != 0 ? c.ClawBackRetention : (matchedSi?.ClawBackRetention ?? 0m);
                    if (cbRetention == 0 && c.ClawBackGross != 0 && c.SplitPercentage > 0 && c.SplitPercentage < 100)
                    {
                        cbRetention = Math.Round(Math.Abs(c.ClawBackGross) * (100m - c.SplitPercentage) / 100m, 2);
                    }

                    var gross = c.GrossCommission > 0 ? c.GrossCommission : (matchedSi?.GrossCommission ?? (c.CommissionAmount + retention + Math.Abs(c.ClawBackGross) - cbRetention));

                    return new PayslipItemDto
                    {
                        ClientName = !string.IsNullOrEmpty(c.Submission?.ApplicantSurname) 
                            ? c.Submission.ApplicantSurname + " " + c.Submission.Initials 
                            : (matchedSi?.ClientName ?? (c.PayoutReference ?? "N/A")),
                        PolicyNumber = string.IsNullOrEmpty(polNo) ? "N/A" : polNo,
                        Product = c.Product ?? "",
                        CaptureDate = c.CaptureDate,
                        Premium = prem,
                        GrossCommission = gross,
                        CommissionRetention = retention,
                        ClawBackGross = c.ClawBackGross,
                        ClawBackRetention = cbRetention,
                        CommissionAmount = c.CommissionAmount,
                        PayoutReference = c.PayoutReference ?? ""
                    };
                }).ToList()
            })
            .OrderBy(x => x.AdvisorName)
            .ToList();

        var pdfBytes = _pdfService.GenerateBulkPayslipsPdf(
            statement.FileName,
            statement.StatementDate,
            grouped);

        return File(pdfBytes, "application/pdf", $"Bulk_Payslips_Statement_{statement.Id}.pdf");
    }

    [HttpPost("payments")]
    public async Task<ActionResult<CommissionResponseDto>> RecordPayment(PolicyPaymentCreateDto dto)
    {
        try
        {
            var result = await _financialsService.RecordPaymentAsync(dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("commissions")]
    public async Task<ActionResult<List<CommissionResponseDto>>> GetCommissions(int? advisorId = null)
    {
        var result = await _financialsService.GetCommissionsAsync(advisorId);
        return Ok(result);
    }

    [HttpPost("commissions/{id}/pay")]
    public async Task<IActionResult> MarkAsPaid(int id, [FromBody] string payoutReference)
    {
        try
        {
            await _financialsService.MarkCommissionAsPaidAsync(id, payoutReference);
            return Ok();
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("advisors/{advisorId}/statements/{statementId}/pay")]
    public async Task<IActionResult> MarkAdvisorStatementAsPaid(int advisorId, int statementId, [FromBody] string payoutReference)
    {
        try
        {
            await _financialsService.MarkAdvisorStatementAsPaidAsync(advisorId, statementId, payoutReference);
            return Ok();
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("submissions/{submissionId}/lapse")]
    public async Task<IActionResult> LapseSubmission(int submissionId, [FromQuery] string? reason = null)
    {
        try
        {
            await _financialsService.HandleLapseAsync(submissionId, reason);
            return Ok(new { message = "Policy lapsed and clawback records generated successfully." });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("bulk-settle")]
    public async Task<IActionResult> BulkSettle(BulkSettlementDto dto)
    {
        try
        {
            await _financialsService.SettleAdvisorStatementAsync(dto);
            return Ok(new { message = "Payout and deductions processed successfully." });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("statement-items/{id}/confirm")]
    public async Task<IActionResult> ConfirmStatementItem(int id, [FromBody] ConfirmLinkDto dto)
    {
        var item = await _context.StatementItems.FindAsync(id);
        if (item == null) return NotFound();

        if (!item.MatchedSubmissionId.HasValue) 
            return BadRequest("Cannot confirm an item that hasn't been matched to a submission.");

        try
        {
            await _financialsService.ManualLinkStatementItemAsync(id, item.MatchedSubmissionId.Value, dto.SelectedAdvisorIds, dto.AdvisorGroupId);
            return Ok(new { message = "Item confirmed and commission records generated." });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("movement-items/{id}/confirm")]
    public async Task<IActionResult> ConfirmMovementItem(int id, [FromBody] ConfirmLinkDto dto)
    {
        var item = await _context.MovementItems.FindAsync(id);
        if (item == null) return NotFound();

        if (!item.MatchedSubmissionId.HasValue) 
            return BadRequest("Cannot confirm a movement that hasn't been matched to a submission.");

        try
        {
            await _financialsService.ManualLinkMovementItemAsync(id, item.MatchedSubmissionId.Value, dto.SelectedAdvisorIds, dto.AdvisorGroupId);
            return Ok(new { message = "Movement item confirmed and records updated." });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("statement-items/{id}/link")]
    public async Task<IActionResult> LinkStatementItem(int id, [FromBody] ManualLinkDto dto)
    {
        try
        {
            await _financialsService.ManualLinkStatementItemAsync(id, dto.SubmissionId, dto.SelectedAdvisorIds, dto.AdvisorGroupId);
            return Ok(new { message = "Item linked and Master Policy updated." });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("movement-items/{id}/link")]
    public async Task<IActionResult> LinkMovementItem(int id, [FromBody] ManualLinkMovementDto dto)
    {
        try
        {
            await _financialsService.ManualLinkMovementItemAsync(id, dto.SubmissionId, dto.SelectedAdvisorIds, dto.AdvisorGroupId);
            return Ok(new { message = "Movement item linked and Master Policy updated." });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("statement-items/{id}/direct-assign")]
    public async Task<IActionResult> DirectAssignStatementItem(int id, [FromBody] DirectAssignDto dto)
    {
        try
        {
            await _financialsService.DirectAssignStatementItemAsync(id, dto.SelectedAdvisorIds, dto.AdvisorGroupId);
            return Ok(new { message = "Item directly assigned to advisors." });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("movement-items/{id}/direct-assign")]
    public async Task<IActionResult> DirectAssignMovementItem(int id, [FromBody] DirectAssignDto dto)
    {
        try
        {
            await _financialsService.DirectAssignMovementItemAsync(id, dto.SelectedAdvisorIds, dto.AdvisorGroupId);
            return Ok(new { message = "Movement item directly assigned to advisors." });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    // --- Ledger & Promotional Items ---

    [HttpGet("promotional-items")]
    public async Task<IActionResult> GetPromotionalItems()
    {
        var items = await _financialsService.GetPromotionalItemsAsync();
        return Ok(items);
    }

    [HttpPost("promotional-items")]
    public async Task<IActionResult> AddPromotionalItem(PromotionalItem item)
    {
        var result = await _financialsService.AddPromotionalItemAsync(item);
        return Ok(result);
    }

    [HttpPost("adjustments")]
    public async Task<IActionResult> CreateAdjustment(AccountAdjustment adjustment)
    {
        try
        {
            var result = await _financialsService.AddAdjustmentAsync(adjustment);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("adjustments/outstanding")]
    public async Task<IActionResult> GetOutstandingAdjustments([FromQuery] int? advisorId, [FromQuery] int? groupId)
    {
        var result = await _financialsService.GetOutstandingAdjustmentsAsync(advisorId, groupId);
        return Ok(result);
    }

    [HttpPost("adjustments/{id}/deduct")]
    public async Task<IActionResult> ApplyDeduction(int id, [FromBody] DeductionRequest dto)
    {
        try
        {
            await _financialsService.ApplyDeductionAsync(id, dto.Amount, dto.StatementId, dto.AdvisorId);
            return Ok();
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("advisors/{advisorId}/adjustments/type/{type}/deduct")]
    public async Task<IActionResult> ApplyDeductionToType(int advisorId, AdjustmentType type, [FromBody] DeductionRequest dto)
    {
        try
        {
            await _financialsService.ApplyDeductionToTypeAsync(advisorId, type, dto.Amount, dto.StatementId);
            return Ok();
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }
}

public class DeductionRequest
{
    public decimal Amount { get; set; }
    public int StatementId { get; set; }
    public int? AdvisorId { get; set; }
}
