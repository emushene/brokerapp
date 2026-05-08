using brokerApp.API.DTOs;

namespace brokerApp.API.Services;

public interface IFinancialsService
{
    Task<CommissionResponseDto> RecordPaymentAsync(PolicyPaymentCreateDto dto);
    Task<List<CommissionResponseDto>> GetCommissionsAsync(int? advisorId = null);
    Task MarkCommissionAsPaidAsync(int commissionId, string payoutReference);
    Task HandleLapseAsync(int submissionId);
}
