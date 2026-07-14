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

    [HttpGet("{id}/summary")]
    public async Task<IActionResult> GetAdvisorSummary(int id)
    {
        var advisor = await _context.Advisors.FindAsync(id);
        if (advisor == null) return NotFound();

        var totalEarned = await _context.AdvisorCommissions
            .Where(c => c.AdvisorId == id)
            .SumAsync(c => c.CommissionAmount);

        var totalClawbacks = await _context.AdvisorCommissions
            .Where(c => c.AdvisorId == id && c.CommissionAmount < 0)
            .SumAsync(c => c.CommissionAmount);

        var activePolicies = await _context.Submissions
            .Where(s => s.Advisors.Any(a => a.Id == id) && s.Status == SubmissionStatus.Active)
            .CountAsync();

        var pendingPolicies = await _context.Submissions
            .Where(s => s.Advisors.Any(a => a.Id == id) && s.Status == SubmissionStatus.Submitted)
            .CountAsync();

        var recentCommissions = await _context.AdvisorCommissions
            .Where(c => c.AdvisorId == id)
            .OrderByDescending(c => c.DateCalculated)
            .Take(10)
            .ToListAsync();

        var outstandingAdjustments = await _context.AccountAdjustments
            .Where(a => a.AdvisorId == id && a.RemainingBalance > 0)
            .ToListAsync();

        return Ok(new {
            AdvisorName = advisor.Name,
            TotalEarned = totalEarned,
            TotalClawbacks = Math.Abs(totalClawbacks),
            ActivePoliciesCount = activePolicies,
            PendingPoliciesCount = pendingPolicies,
            OutstandingDebt = outstandingAdjustments.Sum(a => a.RemainingBalance),
            RecentCommissions = recentCommissions.Select(c => new {
                c.Id,
                c.CommissionAmount,
                c.DateCalculated,
                c.PayoutReference
            })
        });
    }

    [HttpGet("performance")]
    public async Task<ActionResult<IEnumerable<AdvisorPerformanceDto>>> GetPerformance()
    {
        var advisors = await _context.Advisors.ToListAsync();
        
        var rawData = await _context.Advisors
            .SelectMany(a => a.Submissions.Select(s => new {
                AdvisorId = a.Id,
                SubmissionDate = s.Date,
                Premium = s.Premium
            }))
            .ToListAsync();

        var result = advisors.Select(a => {
            var advisorStats = rawData.Where(d => d.AdvisorId == a.Id).ToList();
            
            return new AdvisorPerformanceDto
            {
                AdvisorId = a.Id,
                AdvisorName = a.Name,
                WeeklyStats = advisorStats
                    .GroupBy(d => {
                        // Ensure we are working with the date at the start of the day in UTC
                        var date = d.SubmissionDate.ToUniversalTime().Date;
                        // Calculate Monday of that week
                        int diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
                        return date.AddDays(-1 * diff);
                    })
                    .Select(g => new WeeklyStatsDto
                    {
                        WeekStarting = g.Key,
                        WeekLabel = $"Week of {g.Key:MMM dd, yyyy}",
                        SubmissionCount = g.Count(),
                        TotalPremium = g.Sum(d => d.Premium)
                    })
                    .OrderByDescending(w => w.WeekStarting)
                    .ToList()
            };
        }).ToList();

        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<AdvisorDto>> CreateAdvisor(AdvisorDto dto)
    {
        var advisor = new Advisor
        {
            Name = dto.Name,
            Email = dto.Email,
            Code = dto.Code,
            PhoneNumber = dto.PhoneNumber,
            CommissionPercentage1stYear = dto.CommissionPercentage1stYear,
            CommissionPercentage2ndYear = dto.CommissionPercentage2ndYear,
            SalesforceName = dto.SalesforceName,
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
        advisor.Email = dto.Email;
        advisor.Code = dto.Code;
        advisor.PhoneNumber = dto.PhoneNumber;
        advisor.CommissionPercentage1stYear = dto.CommissionPercentage1stYear;
        advisor.CommissionPercentage2ndYear = dto.CommissionPercentage2ndYear;
        advisor.SalesforceName = dto.SalesforceName;

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
