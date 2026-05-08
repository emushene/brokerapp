using brokerApp.API.DTOs;
using brokerApp.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace brokerApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FinancialsController : ControllerBase
{
    private readonly IFinancialsService _financialsService;

    public FinancialsController(IFinancialsService financialsService)
    {
        _financialsService = financialsService;
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
