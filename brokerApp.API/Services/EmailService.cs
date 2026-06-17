using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using System.Text;

namespace brokerApp.API.Services;

public class EmailService : IEmailService
{
    private readonly ILogger<EmailService> _logger;

    public EmailService(ILogger<EmailService> logger)
    {
        _logger = logger;
    }

    public async Task SendEmailAsync(string to, string subject, string body)
    {
        // Log for production tracking
        _logger.LogInformation("EMAIL_QUEUE: To={To}, Subject={Subject}", to, subject);
        
        // Simulating some async work
        await Task.Delay(100);
    }

    public async Task SendProcessedPoliciesNotificationAsync(string advisorName, string advisorEmail, string statementName, decimal totalGross, List<string> policies)
    {
        var subject = $"BrokerApp: Policies Processed - {statementName}";
        
        var policyListHtml = new StringBuilder("<ul>");
        foreach (var p in policies) policyListHtml.Append($"<li>{p}</li>");
        policyListHtml.Append("</ul>");

        var body = $@"
            <div style='font-family: sans-serif; color: #333;'>
                <h2>Hello {advisorName},</h2>
                <p>We have finished processing your policies for the commission run: <strong>{statementName}</strong>.</p>
                <p><strong>Total Gross Earnings:</strong> R {totalGross:N2}</p>
                <p><strong>Policies Included:</strong></p>
                {policyListHtml}
                <p style='color: #666; font-style: italic;'>Note: This is a processing summary only. Your final payout will be sent once deductions (if any) are applied.</p>
                <br/>
                <p>Regards,<br/>BrokerApp Team</p>
            </div>";

        await SendEmailAsync(advisorEmail, subject, body);
    }

    public async Task SendFinalPayslipNotificationAsync(string advisorName, string advisorEmail, string statementName, decimal netPayout, string payoutRef, List<string> deductions)
    {
        var subject = $"BrokerApp: Final Payslip & Payment - {statementName}";

        var deductionHtml = "";
        if (deductions.Count > 0)
        {
            var list = new StringBuilder("<p><strong>Deductions Applied:</strong></p><ul>");
            foreach (var d in deductions) list.Append($"<li>{d}</li>");
            list.Append("</ul>");
            deductionHtml = list.ToString();
        }

        var body = $@"
            <div style='font-family: sans-serif; color: #333;'>
                <h2>Hello {advisorName},</h2>
                <p>Your payment for <strong>{statementName}</strong> has been processed.</p>
                <div style='background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;'>
                    <p style='margin: 0;'><strong>EFT Payout Reference:</strong> {payoutRef}</p>
                    <p style='margin: 10px 0; font-size: 24px; font-weight: bold; color: #16a34a;'>Net Amount: R {netPayout:N2}</p>
                </div>
                {deductionHtml}
                <p>The funds should appear in your account shortly.</p>
                <br/>
                <p>Regards,<br/>BrokerApp Team</p>
            </div>";

        await SendEmailAsync(advisorEmail, subject, body);
    }
}
