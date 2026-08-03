using brokerApp.API.DTOs;
using brokerApp.API.Models;

namespace brokerApp.API.Services;

public interface IFinancialsService
{
    Task<CommissionResponseDto> RecordPaymentAsync(PolicyPaymentCreateDto dto);
    Task<List<CommissionResponseDto>> GetCommissionsAsync(int? advisorId = null);
    Task MarkCommissionAsPaidAsync(int commissionId, string payoutReference);
    Task MarkAdvisorStatementAsPaidAsync(int advisorId, int statementId, string payoutReference);
    Task HandleLapseAsync(int submissionId, string? reason = null);
    Task ManualLinkStatementItemAsync(int itemId, int submissionId, List<int>? selectedAdvisorIds = null, int? advisorGroupId = null);
    Task ManualLinkMovementItemAsync(int itemId, int submissionId, List<int>? selectedAdvisorIds = null, int? advisorGroupId = null);
    Task DirectAssignStatementItemAsync(int itemId, List<int> selectedAdvisorIds, int? advisorGroupId = null);
    Task DirectAssignMovementItemAsync(int itemId, List<int> selectedAdvisorIds, int? advisorGroupId = null);
    Task ConcludeStatementAsync(int statementId);
    Task SettleAdvisorStatementAsync(BulkSettlementDto dto);

    // Ledger & Promotional Items
    Task<IEnumerable<PromotionalItem>> GetPromotionalItemsAsync();
    Task<PromotionalItem> AddPromotionalItemAsync(PromotionalItem item);
    Task<AccountAdjustmentDto> AddAdjustmentAsync(AccountAdjustment adjustment);
    Task<IEnumerable<AccountAdjustmentDto>> GetOutstandingAdjustmentsAsync(int? advisorId = null, int? groupId = null);
    Task ApplyDeductionAsync(int adjustmentId, decimal amount, int statementId, int? advisorId = null);
    Task ApplyDeductionToTypeAsync(int advisorId, AdjustmentType type, decimal amount, int statementId);
    Task<AdvancesGiftsReportDto> GetAdvancesAndGiftsReportAsync(int page = 1, int pageSize = 10, string? searchTerm = null, string? typeFilter = null, string? statusFilter = null);
}


