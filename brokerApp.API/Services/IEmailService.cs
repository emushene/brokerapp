namespace brokerApp.API.Services;

public interface IEmailService
{
    Task SendEmailAsync(string to, string subject, string body);
    Task SendCommissionNotificationAsync(string advisorName, string advisorEmail, string statementName, decimal amount);
}
