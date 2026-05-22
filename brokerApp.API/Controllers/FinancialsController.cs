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
    private readonly ApplicationDbContext _context;

    public FinancialsController(
        IFinancialsService financialsService, 
        IReconciliationService reconciliationService,
        IFileStorageService fileStorageService,
        IGoogleSheetsService sheetsService,
        ApplicationDbContext context)
    {
        _financialsService = financialsService;
        _reconciliationService = reconciliationService;
        _fileStorageService = fileStorageService;
        _sheetsService = sheetsService;
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
    public async Task<IActionResult> GetStatementDetails(int id)
    {
        var statement = await _context.CommissionStatements
            .Include(s => s.Items)
                .ThenInclude(i => i.MatchedSubmission)
            .Include(s => s.MovementItems)
                .ThenInclude(m => m.MatchedSubmission)
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
            await _financialsService.ApplyDeductionAsync(id, dto.Amount, dto.StatementId);
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
}
