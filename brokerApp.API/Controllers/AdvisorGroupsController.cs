using Microsoft.AspNetCore.Mvc;
using brokerApp.API.Data;
using brokerApp.API.DTOs;
using brokerApp.API.Models;
using Microsoft.EntityFrameworkCore;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;

namespace brokerApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AdvisorGroupsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public AdvisorGroupsController(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AdvisorGroupDto>>> GetGroups()
    {
        var groups = await _context.AdvisorGroups
            .Include(g => g.Members)
            .ToListAsync();
            
        return Ok(_mapper.Map<IEnumerable<AdvisorGroupDto>>(groups));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AdvisorGroupDto>> GetGroup(int id)
    {
        var group = await _context.AdvisorGroups
            .Include(g => g.Members)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group == null) return NotFound();
        return Ok(_mapper.Map<AdvisorGroupDto>(group));
    }

    [HttpPost]
    public async Task<ActionResult<AdvisorGroupDto>> CreateGroup(AdvisorGroupDto dto)
    {
        var group = new AdvisorGroup
        {
            Name = dto.Name,
            Description = dto.Description
        };

        if (dto.MemberIds != null && dto.MemberIds.Any())
        {
            var members = await _context.Advisors
                .Where(a => dto.MemberIds.Contains(a.Id))
                .ToListAsync();
            foreach (var member in members) group.Members.Add(member);
        }

        _context.AdvisorGroups.Add(group);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetGroup), new { id = group.Id }, _mapper.Map<AdvisorGroupDto>(group));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateGroup(int id, AdvisorGroupDto dto)
    {
        var group = await _context.AdvisorGroups
            .Include(g => g.Members)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group == null) return NotFound();

        group.Name = dto.Name;
        group.Description = dto.Description;

        // Sync members
        group.Members.Clear();
        if (dto.MemberIds != null && dto.MemberIds.Any())
        {
            var members = await _context.Advisors
                .Where(a => dto.MemberIds.Contains(a.Id))
                .ToListAsync();
            foreach (var member in members) group.Members.Add(member);
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteGroup(int id)
    {
        var group = await _context.AdvisorGroups.FindAsync(id);
        if (group == null) return NotFound();

        _context.AdvisorGroups.Remove(group);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
