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
    private readonly IEmailService _emailService;

    public FinancialsService(ApplicationDbContext context, IMapper mapper, IEmailService emailService)
    {
        _context = context;
        _mapper = mapper;
        _emailService = emailService;
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
            // Defaulting to 70% if we don't know the category here, 
            // but usually this method is for manual/legacy payments.
            foreach (var advisor in submission.Advisors)
            {
                var percentage = advisor.CommissionPercentage1stYear / 100m;
                var commissionAmount = (payment.AmountReceived * percentage) / submission.Advisors.Count;

                var commission = new AdvisorCommission
                {
                    PolicyPaymentId = payment.Id,
                    SubmissionId = submission.Id,
                    AdvisorId = advisor.Id,
                    CommissionAmount = commissionAmount,
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

    public async Task ManualLinkStatementItemAsync(int itemId, int submissionId, List<int>? selectedAdvisorIds = null, int? advisorGroupId = null)
    {
        var item = await _context.StatementItems.FindAsync(itemId);
        var sub = await _context.Submissions
            .Include(s => s.Advisors)
            .Include(s => s.AdvisorGroup)
                .ThenInclude(g => g!.Members)
            .Include(s => s.Documents)
            .FirstOrDefaultAsync(s => s.Id == submissionId);

        if (item == null || sub == null) throw new Exception("Item or Submission not found");

        item.MatchedSubmissionId = sub.Id;
        item.IsConfirmed = true;

        // Follow the Money: Determine who gets paid
        var advisorsToPay = new List<Advisor>();
        int? effectiveGroupId = advisorGroupId;

        if (selectedAdvisorIds != null && selectedAdvisorIds.Any())
        {
            advisorsToPay = await _context.Advisors
                .Where(a => selectedAdvisorIds.Contains(a.Id))
                .ToListAsync();
        }
        else if (advisorGroupId.HasValue)
        {
            var group = await _context.AdvisorGroups
                .Include(g => g.Members)
                .FirstOrDefaultAsync(g => g.Id == advisorGroupId.Value);
            if (group != null)
            {
                advisorsToPay = group.Members.ToList();
            }
        }
        else
        {
            effectiveGroupId = sub.AdvisorGroupId;
            advisorsToPay = sub.AdvisorGroupId.HasValue 
                ? sub.AdvisorGroup!.Members.ToList() 
                : sub.Advisors.ToList();
        }

        if (effectiveGroupId.HasValue)
        {
            var group = await _context.AdvisorGroups.FindAsync(effectiveGroupId.Value);
            item.AdvisorName = $"Group: {group?.Name ?? "Unknown"}";
            if (selectedAdvisorIds != null && selectedAdvisorIds.Any())
            {
                item.AdvisorName += $" ({string.Join(", ", advisorsToPay.Select(a => a.Name))})";
            }
        }
        else
        {
            item.AdvisorName = string.Join(", ", advisorsToPay.Select(a => a.Name));
        }

        item.FileUrl = sub.Documents.OrderByDescending(d => d.DateModified).FirstOrDefault()?.FileUrl;
        item.GoogleDriveLink = item.FileUrl;

        if (advisorsToPay.Any())
        {
            var category = item.Category ?? "";
            var isSecondYear = category.Contains("2nd") || category.Contains("Second");
            
            foreach (var advisor in advisorsToPay)
            {
                var rate = isSecondYear ? advisor.CommissionPercentage2ndYear : advisor.CommissionPercentage1stYear;
                var percentage = rate / 100m;
                var commissionPerAdvisor = (item.Amount * percentage) / advisorsToPay.Count;

                var commission = new AdvisorCommission
                {
                    SubmissionId = sub.Id,
                    AdvisorId = advisor.Id,
                    CommissionStatementId = item.CommissionStatementId,
                    CommissionAmount = commissionPerAdvisor,
                    DateCalculated = DateTime.UtcNow,
                    PayoutReference = $"{item.Category} - {item.PolicyNumber}",
                    IsPaid = false
                };
                _context.AdvisorCommissions.Add(commission);
            }
        }

        await UpdateMasterPolicyAsync(item.PolicyNumber, sub, item.Amount, item.Premium, item.Category == "Lapse", advisorsToPay, effectiveGroupId);
        await _context.SaveChangesAsync();
    }

    public async Task ManualLinkMovementItemAsync(int itemId, int submissionId, List<int>? selectedAdvisorIds = null, int? advisorGroupId = null)
    {
        var item = await _context.MovementItems.FindAsync(itemId);
        var sub = await _context.Submissions
            .Include(s => s.Advisors)
            .Include(s => s.AdvisorGroup)
                .ThenInclude(g => g!.Members)
            .Include(s => s.Documents)
            .FirstOrDefaultAsync(s => s.Id == submissionId);

        if (item == null || sub == null) throw new Exception("Item or Submission not found");

        item.MatchedSubmissionId = sub.Id;
        item.IsConfirmed = true;

        // Follow the Money: Determine who gets paid
        var advisorsInvolved = new List<Advisor>();
        int? effectiveGroupId = advisorGroupId;

        if (selectedAdvisorIds != null && selectedAdvisorIds.Any())
        {
            advisorsInvolved = await _context.Advisors
                .Where(a => selectedAdvisorIds.Contains(a.Id))
                .ToListAsync();
        }
        else if (advisorGroupId.HasValue)
        {
            var group = await _context.AdvisorGroups
                .Include(g => g.Members)
                .FirstOrDefaultAsync(g => g.Id == advisorGroupId.Value);
            if (group != null)
            {
                advisorsInvolved = group.Members.ToList();
            }
        }
        else
        {
            effectiveGroupId = sub.AdvisorGroupId;
            advisorsInvolved = sub.AdvisorGroupId.HasValue 
                ? sub.AdvisorGroup!.Members.ToList() 
                : sub.Advisors.ToList();
        }

        if (effectiveGroupId.HasValue)
        {
            var group = await _context.AdvisorGroups.FindAsync(effectiveGroupId.Value);
            item.AdvisorName = $"Group: {group?.Name ?? "Unknown"}";
            if (selectedAdvisorIds != null && selectedAdvisorIds.Any())
            {
                item.AdvisorName += $" ({string.Join(", ", advisorsInvolved.Select(a => a.Name))})";
            }
        }
        else
        {
            item.AdvisorName = string.Join(", ", advisorsInvolved.Select(a => a.Name));
        }

        item.FileUrl = sub.Documents.OrderByDescending(d => d.DateModified).FirstOrDefault()?.FileUrl;
        item.GoogleDriveLink = item.FileUrl;

        // If it's a lapse in movement, we might need to trigger clawbacks
        if (item.Category == "Lapse" && advisorsInvolved.Any())
        {
            // Calculate total commissions already paid for this submission to claw them back
            var paidCommissions = await _context.AdvisorCommissions
                .Where(c => c.SubmissionId == sub.Id && c.CommissionAmount > 0)
                .ToListAsync();

            var commissionsByAdvisor = paidCommissions.GroupBy(c => c.AdvisorId);

            foreach (var group in commissionsByAdvisor)
            {
                var totalToClawback = group.Sum(c => c.CommissionAmount);
                if (totalToClawback > 0)
                {
                    _context.AdvisorCommissions.Add(new AdvisorCommission
                    {
                        SubmissionId = sub.Id,
                        AdvisorId = group.Key,
                        CommissionStatementId = item.CommissionStatementId,
                        CommissionAmount = -totalToClawback,
                        DateCalculated = DateTime.UtcNow,
                        PayoutReference = $"CLAWBACK (LAPSE) - {item.PolicyNumber}",
                        IsPaid = false
                    });
                }
            }
        }

        await UpdateMasterPolicyAsync(item.PolicyNumber, sub, 0, item.Premium, item.Category == "Lapse", advisorsInvolved, effectiveGroupId);
        await _context.SaveChangesAsync();
    }

    public async Task ConcludeStatementAsync(int statementId)
    {
        var statement = await _context.CommissionStatements.FindAsync(statementId);
        if (statement == null) throw new Exception("Statement not found");

        statement.Status = "Concluded";
        await _context.SaveChangesAsync();

        // Notify advisors involved in this run
        var commissionsInRun = await _context.AdvisorCommissions
            .Include(c => c.Advisor)
            .Where(c => c.CommissionStatementId == statementId)
            .ToListAsync();

        var advisorTotals = commissionsInRun
            .GroupBy(c => new { c.AdvisorId, c.Advisor.Name, c.Advisor.Email })
            .Select(g => new { g.Key.Name, g.Key.Email, Total = g.Sum(c => c.CommissionAmount) });

        foreach (var adv in advisorTotals)
        {
            if (!string.IsNullOrEmpty(adv.Email))
            {
                try {
                    await _emailService.SendCommissionNotificationAsync(adv.Name, adv.Email, statement.FileName, adv.Total);
                } catch { /* Log and continue */ }
            }
        }

        statement.Status = "Emailed";
        statement.EmailSentDate = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    private async Task UpdateMasterPolicyAsync(string policyNumber, Submission sub, decimal amount, decimal premium, bool isLapse, List<Advisor>? effectiveAdvisors = null, int? effectiveGroupId = null)
    {
        var master = await _context.PolicyRecords
            .Include(p => p.Advisors)
            .FirstOrDefaultAsync(p => p.PolicyNumber == policyNumber);

        // Always ensure the submission has the correct policy number if it was linked
        if (string.IsNullOrEmpty(sub.PolicyNumber) || sub.PolicyNumber != policyNumber)
        {
            sub.PolicyNumber = policyNumber;
        }

        // Update submission premium from the statement/movement
        if (premium > 0)
        {
            sub.Premium = premium;
        }

        // Update submission status based on the transaction
        sub.Status = isLapse ? SubmissionStatus.Lapsed : SubmissionStatus.Active;

        var advisorsToSync = effectiveAdvisors ?? sub.Advisors.ToList();
        var groupIdToSync = effectiveGroupId ?? sub.AdvisorGroupId;

        // Sync the Submission as well if a manual change was provided
        if (effectiveAdvisors != null || effectiveGroupId.HasValue)
        {
            sub.AdvisorGroupId = groupIdToSync;
            sub.Advisors.Clear();
            foreach (var adv in advisorsToSync) sub.Advisors.Add(adv);
        }

        if (master == null)
        {
            master = new PolicyRecord
            {
                PolicyNumber = policyNumber,
                Surname = sub.ApplicantSurname,
                Initials = sub.Initials,
                Premium = sub.Premium,
                LastCommissionAmount = amount,
                Status = sub.Status,
                LastUpdated = DateTime.UtcNow,
                IsConfirmed = true,
                AdvisorGroupId = groupIdToSync
            };
            foreach (var adv in advisorsToSync) master.Advisors.Add(adv);
            _context.PolicyRecords.Add(master);
        }
        else
        {
            master.IsConfirmed = true;
            master.Surname = sub.ApplicantSurname;
            master.Initials = sub.Initials;
            master.Premium = sub.Premium;
            master.LastCommissionAmount = amount > 0 ? amount : master.LastCommissionAmount;
            master.LastUpdated = DateTime.UtcNow;
            master.Status = sub.Status;
            master.AdvisorGroupId = groupIdToSync;

            // Sync advisors
            master.Advisors.Clear();
            foreach (var adv in advisorsToSync) master.Advisors.Add(adv);
        }
    }

    // --- Ledger & Promotional Items ---

    public async Task<IEnumerable<PromotionalItem>> GetPromotionalItemsAsync()
    {
        return await _context.PromotionalItems.ToListAsync();
    }

    public async Task<PromotionalItem> AddPromotionalItemAsync(PromotionalItem item)
    {
        _context.PromotionalItems.Add(item);
        await _context.SaveChangesAsync();
        return item;
    }

    public async Task<AccountAdjustmentDto> AddAdjustmentAsync(AccountAdjustment adjustment)
    {
        // Business Rule: Advances are for individuals only
        if (adjustment.Type == AdjustmentType.Advance && adjustment.AdvisorGroupId.HasValue)
        {
            throw new InvalidOperationException("Cash advances can only be assigned to individual advisors, not groups.");
        }

        adjustment.RemainingBalance = adjustment.TotalAmount;
        adjustment.DateIncurred = DateTime.UtcNow;
        adjustment.Status = AdjustmentStatus.Pending;

        _context.AccountAdjustments.Add(adjustment);
        await _context.SaveChangesAsync();

        // Reload to get includes for DTO mapping
        var reloaded = await _context.AccountAdjustments
            .Include(a => a.Advisor)
            .Include(a => a.AdvisorGroup)
            .Include(a => a.PromotionalItem)
            .FirstOrDefaultAsync(a => a.Id == adjustment.Id);

        return _mapper.Map<AccountAdjustmentDto>(reloaded);
    }

    public async Task<IEnumerable<AccountAdjustmentDto>> GetOutstandingAdjustmentsAsync(int? advisorId = null, int? groupId = null)
    {
        var query = _context.AccountAdjustments
            .Include(a => a.PromotionalItem)
            .Include(a => a.Advisor)
            .Include(a => a.AdvisorGroup)
            .Where(a => a.RemainingBalance > 0);

        if (advisorId.HasValue) query = query.Where(a => a.AdvisorId == advisorId.Value);
        if (groupId.HasValue) query = query.Where(a => a.AdvisorGroupId == groupId.Value);

        var list = await query.ToListAsync();
        return _mapper.Map<IEnumerable<AccountAdjustmentDto>>(list);
    }

    public async Task ApplyDeductionAsync(int adjustmentId, decimal amount, int statementId)
    {
        var adj = await _context.AccountAdjustments.FindAsync(adjustmentId);
        if (adj == null) return;

        adj.RemainingBalance -= amount;
        if (adj.RemainingBalance <= 0)
        {
            adj.RemainingBalance = 0;
            adj.Status = AdjustmentStatus.Cleared;
        }
        else
        {
            adj.Status = AdjustmentStatus.PartiallyPaid;
        }

        // We record the deduction as a negative commission record to impact the payslip
        // This keeps the ledger audit trail visible in the commission history
        var deduction = new AdvisorCommission
        {
            AdvisorId = adj.AdvisorId ?? 0, // Handle group deductions logic if needed
            CommissionStatementId = statementId,
            CommissionAmount = -amount,
            DateCalculated = DateTime.UtcNow,
            PayoutReference = $"DEDUCTION: {adj.Type} - {adj.Description}",
            IsPaid = true,
            DatePaid = DateTime.UtcNow
        };

        if (adj.AdvisorGroupId.HasValue && !adj.AdvisorId.HasValue)
        {
            // If it was a group deduction, we might need to decide how to split it
            // For now, if we are applying it to a specific payslip, we need an AdvisorId.
            // In the UI, the manager will select WHICH advisor's payslip to deduct from.
            throw new InvalidOperationException("Group deductions must be targeted to a specific advisor's payslip.");
        }

        _context.AdvisorCommissions.Add(deduction);
        await _context.SaveChangesAsync();
    }
}
