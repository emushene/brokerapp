using System.Collections.Generic;

namespace brokerApp.API.DTOs;

public class BulkSettlementDto
{
    public int AdvisorId { get; set; }
    public int StatementId { get; set; }
    public string PayoutReference { get; set; } = string.Empty;
    public List<DeductionItemDto> Deductions { get; set; } = new();
}

public class DeductionItemDto
{
    public int AdjustmentId { get; set; }
    public decimal Amount { get; set; }
}
