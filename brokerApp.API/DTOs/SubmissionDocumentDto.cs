namespace brokerApp.API.DTOs;

public class SubmissionDocumentDto
{
    public int Id { get; set; }
    public string StorageKey { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public DateTime DateModified { get; set; }
}
