using brokerApp.API.DTOs;
using brokerApp.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace brokerApp.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class SubmissionsController : ControllerBase
{
    private readonly ISubmissionService _submissionService;

    public SubmissionsController(ISubmissionService submissionService)
    {
        _submissionService = submissionService;
    }

    [HttpPost]
    public async Task<ActionResult<SubmissionResponseDto>> Create([FromForm] SubmissionCreateDto request)
    {
        try
        {
            var response = await _submissionService.CreateSubmissionAsync(request);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ex.Message);
        }
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SubmissionResponseDto>>> GetByAdvisor([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        try
        {
            var submissions = await _submissionService.GetAdvisorSubmissionsAsync(page, pageSize);
            return Ok(submissions);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ex.Message);
        }
    }

    [HttpGet("advisor/{advisorId}")]
    public async Task<ActionResult<IEnumerable<SubmissionResponseDto>>> GetByAdvisorId(int advisorId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var submissions = await _submissionService.GetSubmissionsByAdvisorIdAsync(advisorId, page, pageSize);
        return Ok(submissions);
    }

    [HttpGet("all")]
    public async Task<ActionResult<IEnumerable<SubmissionResponseDto>>> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var submissions = await _submissionService.GetAllSubmissionsAsync(page, pageSize);
        return Ok(submissions);
    }

    [HttpGet("search")]
    public async Task<ActionResult<IEnumerable<SubmissionResponseDto>>> Search([FromQuery] string q, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var submissions = await _submissionService.SearchSubmissionsAsync(q, page, pageSize);
        return Ok(submissions);
    }

    [HttpPost("{id}/documents")]
    public async Task<ActionResult<SubmissionResponseDto>> UploadDocument(int id, IFormFile file)
    {
        try
        {
            var response = await _submissionService.UploadDocumentAsync(id, file);
            return Ok(response);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }
}