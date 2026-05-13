using AutoMapper;
using brokerApp.API.Data;
using brokerApp.API.DTOs;
using brokerApp.API.Models;
using Microsoft.EntityFrameworkCore;

namespace brokerApp.API.Services;

public class FinancialsService : IFinancialsService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public FinancialsService(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<CommissionResponseDto> RecordPaymentAsync(PolicyPaymentCreateDto dto)
    {
        var submission = await _context.Submissions
            .Include(s => s.Advisors)
            .FirstOrDefaultAsync(s => s.Id == dto.SubmissionId);

        if (submission == null) throw new Exception("Submission not found");

        var payment = _mapper.Map<PolicyPayment>(dto);
        // Ensure DateReceived is UTC for Postgres
        payment.DateReceived = DateTime.SpecifyKind(payment.DateReceived, DateTimeKind.Utc);
        
        _context.PolicyPayments.Add(payment);
        await _context.SaveChangesAsync();

        if (submission.Advisors.Any())
        {
            var totalCommissionAmount = payment.AmountReceived * 0.7m;
            var commissionPerAdvisor = totalCommissionAmount / submission.Advisors.Count;

            foreach (var advisor in submission.Advisors)
            {
                var commission = new AdvisorCommission
                {
                    PolicyPaymentId = payment.Id,
                    SubmissionId = submission.Id,
                    AdvisorId = advisor.Id,
                    CommissionAmount = commissionPerAdvisor,
                    DateCalculated = DateTime.UtcNow
                };
                _context.AdvisorCommissions.Add(commission);
            }

            await _context.SaveChangesAsync();
        }

        // Update Submission status if it was just Submitted
        if (submission.Status == SubmissionStatus.Submitted)
        {
            submission.Status = SubmissionStatus.Active;
            await _context.SaveChangesAsync();
        }

        // Return a response. If multiple advisors, we return the first one as representative
        // but the frontend usually fetches all commissions later.
        var firstCommissionRecord = await _context.AdvisorCommissions
            .Include(c => c.PolicyPayment)
            .Include(c => c.Advisor)
            .FirstOrDefaultAsync(c => c.PolicyPaymentId == payment.Id);

        if (firstCommissionRecord == null)
        {
            // If no advisors were present, return a dummy/minimal DTO
            return new CommissionResponseDto
            {
                PolicyPaymentId = payment.Id,
                AmountReceived = payment.AmountReceived,
                Reference = payment.Reference,
                DateCalculated = DateTime.UtcNow,
                AdvisorName = "No Advisor Assigned"
            };
        }

        return _mapper.Map<CommissionResponseDto>(firstCommissionRecord);
    }

    public async Task<List<CommissionResponseDto>> GetCommissionsAsync(int? advisorId = null)
    {
        var query = _context.AdvisorCommissions
            .Include(c => c.PolicyPayment)
            .Include(c => c.Submission)
                .ThenInclude(s => s.Documents)
            .Include(c => c.Advisor)
            .AsQueryable();

        if (advisorId.HasValue)
        {
            query = query.Where(c => c.AdvisorId == advisorId.Value);
        }

        var commissions = await query.ToListAsync();
        return _mapper.Map<List<CommissionResponseDto>>(commissions);
    }

    public async Task MarkCommissionAsPaidAsync(int commissionId, string payoutReference)
    {
        var commission = await _context.AdvisorCommissions.FindAsync(commissionId);
        if (commission == null) throw new Exception("Commission record not found");

        commission.IsPaid = true;
        commission.DatePaid = DateTime.UtcNow;
        commission.PayoutReference = payoutReference;

        await _context.SaveChangesAsync();
    }

    public async Task HandleLapseAsync(int submissionId)
    {
        var submission = await _context.Submissions
            .Include(s => s.Advisors)
            .FirstOrDefaultAsync(s => s.Id == submissionId);

        if (submission == null) throw new Exception("Submission not found");

        // Update status
        submission.Status = SubmissionStatus.Lapsed;

        // Calculate total commissions already recorded for this submission
        var existingCommissions = await _context.AdvisorCommissions
            .Where(c => c.SubmissionId == submissionId)
            .ToListAsync();

        // Create clawback records (negative commissions)
        // Group by advisor to claw back everything they earned
        var commissionsByAdvisor = existingCommissions.GroupBy(c => c.AdvisorId);

        foreach (var group in commissionsByAdvisor)
        {
            var totalToClawback = group.Sum(c => c.CommissionAmount);
            if (totalToClawback > 0)
            {
                var clawback = new AdvisorCommission
                {
                    SubmissionId = submissionId,
                    AdvisorId = group.Key,
                    CommissionAmount = -totalToClawback, // Negative amount
                    DateCalculated = DateTime.UtcNow,
                    IsPaid = false, // This is a debt the advisor owes
                    PayoutReference = "CLAWBACK - POLICY LAPSED"
                };
                _context.AdvisorCommissions.Add(clawback);
            }
        }

        await _context.SaveChangesAsync();
    }
}