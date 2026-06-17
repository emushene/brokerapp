namespace brokerApp.API.Models;

public class SubmissionDocument
{
    public int Id { get; set; }
    public int SubmissionId { get; set; }
    public Submission Submission { get; set; } = null!;
    
    public string StorageKey { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public DateTime DateModified { get; set; }
}
