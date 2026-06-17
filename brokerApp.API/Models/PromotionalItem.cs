namespace brokerApp.API.Models;

public class PromotionalItem
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Sizes { get; set; } = string.Empty; // Comma-separated sizes e.g. "S,M,L,XL"
}
