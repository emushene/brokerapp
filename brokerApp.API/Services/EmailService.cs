using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

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
        // Mocking email sending for now
        _logger.LogInformation("Sending email to {To} with subject: {Subject}", to, subject);
        _logger.LogInformation("Body: {Body}", body);
        
        // Simulating some async work
        await Task.Delay(100);
    }

    public async Task SendCommissionNotificationAsync(string advisorName, string advisorEmail, string statementName, decimal amount)
    {
        var subject = $"BrokerApp: Commission Run Concluded - {statementName}";
        var body = $@"
            <h2>Hello {advisorName},</h2>
            <p>A new commission run has been concluded: <strong>{statementName}</strong>.</p>
            <p>Your total payout for this run is: <strong>R {amount:N2}</strong>.</p>
            <p>You can view your detailed pay slip on the advisor portal.</p>
            <br/>
            <p>Regards,<br/>BrokerApp Team</p>";

        await SendEmailAsync(advisorEmail, subject, body);
    }
}
