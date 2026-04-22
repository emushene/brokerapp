namespace brokerApp.API.Models;

public class Advisor
{
    public int Id { get; set; }
    public string FirebaseId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;

    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
}
