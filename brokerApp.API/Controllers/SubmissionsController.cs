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
    public async Task<ActionResult<SubmissionResponseDto>> Create(SubmissionCreateDto request)
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
    public async Task<ActionResult<IEnumerable<SubmissionResponseDto>>> GetAll()
    {
        try
        {
            var submissions = await _submissionService.GetAdvisorSubmissionsAsync();
            return Ok(submissions);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ex.Message);
        }
    }
}