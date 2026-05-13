using brokerApp.API.Data;
using brokerApp.API.DTOs;
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
    private readonly ApplicationDbContext _context;

    public FinancialsController(
        IFinancialsService financialsService, 
        IReconciliationService reconciliationService,
        IFileStorageService fileStorageService,
        ApplicationDbContext context)
    {
        _financialsService = financialsService;
        _reconciliationService = reconciliationService;
        _fileStorageService = fileStorageService;
        _context = context;
    }

    [HttpPost("import-statement")]
    public async Task<IActionResult> ImportStatement(IFormFile file, [FromForm] DateTime statementDate)
    {
        if (file == null || file.Length == 0) return BadRequest("No file uploaded");

        try
        {
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
            .Include(s => s.MovementItems)
            .FirstOrDefaultAsync(s => s.Id == id);
            
        if (statement == null) return NotFound();
        return Ok(statement);
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

    [HttpPost("submissions/{id}/lapse")]
    public async Task<IActionResult> HandleLapse(int id)
    {
        try
        {
            await _financialsService.HandleLapseAsync(id);
            return Ok();
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
