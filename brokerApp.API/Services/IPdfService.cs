namespace brokerApp.API.Services;

public interface IPdfService
{
    byte[] GenerateAdvisorPayslipPdf(
        string advisorName,
        string advisorCode,
        string advisorEmail,
        string statementName,
        DateTime statementDate,
        IEnumerable<PayslipItemDto> items);

    byte[] GenerateBulkPayslipsPdf(
        string statementName,
        DateTime statementDate,
        IEnumerable<GroupedPayslipDto> groupedPayslips);
}

public class PayslipItemDto
{
    public string ClientName { get; set; } = string.Empty;
    public string PolicyNumber { get; set; } = string.Empty;
    public string Product { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public DateTime? CaptureDate { get; set; }
    public decimal Premium { get; set; }
    public decimal GrossCommission { get; set; }
    public decimal SplitPercentage { get; set; }
    public decimal CommissionAmount { get; set; }
    public string PayoutReference { get; set; } = string.Empty;
}

public class GroupedPayslipDto
{
    public string AdvisorName { get; set; } = string.Empty;
    public string AdvisorCode { get; set; } = string.Empty;
    public string AdvisorEmail { get; set; } = string.Empty;
    public List<PayslipItemDto> Items { get; set; } = new();
}
