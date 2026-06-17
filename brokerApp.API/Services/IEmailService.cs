using System.Collections.Generic;
using System.Threading.Tasks;

namespace brokerApp.API.Services;

public interface IEmailService
{
    Task SendEmailAsync(string to, string subject, string body);
    
    // Stage 1: Policies Processed
    Task SendProcessedPoliciesNotificationAsync(string advisorName, string advisorEmail, string statementName, decimal totalGross, List<string> policies);
    
    // Stage 2: Payment Confirmed
    Task SendFinalPayslipNotificationAsync(string advisorName, string advisorEmail, string statementName, decimal netPayout, string payoutRef, List<string> deductions);
}
