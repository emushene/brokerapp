using System.Collections.Generic;

namespace brokerApp.API.Models;

public class AdvisorGroup
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public ICollection<Advisor> Members { get; set; } = new List<Advisor>();
    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
}
