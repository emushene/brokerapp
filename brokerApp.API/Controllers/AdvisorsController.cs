using Microsoft.AspNetCore.Mvc;
using brokerApp.API.Data;
using brokerApp.API.DTOs;
using brokerApp.API.Models;
using Microsoft.EntityFrameworkCore;
using AutoMapper;

namespace brokerApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AdvisorsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public AdvisorsController(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AdvisorDto>>> GetAdvisors()
    {
        var advisors = await _context.Advisors.ToListAsync();
        return Ok(_mapper.Map<IEnumerable<AdvisorDto>>(advisors));
    }

    [HttpPost]
    public async Task<ActionResult<AdvisorDto>> CreateAdvisor(AdvisorDto dto)
    {
        var advisor = new Advisor
        {
            Name = dto.Name,
            Code = dto.Code,
            FirebaseId = "" // This can be linked later when the user signs up
        };

        _context.Advisors.Add(advisor);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAdvisors), new { id = advisor.Id }, _mapper.Map<AdvisorDto>(advisor));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAdvisor(int id, AdvisorDto dto)
    {
        var advisor = await _context.Advisors.FindAsync(id);
        if (advisor == null) return NotFound();

        advisor.Name = dto.Name;
        advisor.Code = dto.Code;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAdvisor(int id)
    {
        var advisor = await _context.Advisors.FindAsync(id);
        if (advisor == null) return NotFound();

        _context.Advisors.Remove(advisor);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
