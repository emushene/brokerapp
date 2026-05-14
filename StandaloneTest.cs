using System;
using System.Text.RegularExpressions;
using System.Linq;

public class Program {
    public static void Main() {
        string fileName = "9601046040081 GUMEDE MD.pdf";
        var (idNum, surname, initial) = ParseFileName(fileName);
        Console.WriteLine($"ID: '{idNum}', Surname: '{surname}', Initial: '{initial}'");
    }

    private static (string idNum, string surname, string initial) ParseFileName(string fileName)
    {
        var cleanName = fileName.Replace(".pdf", "", StringComparison.OrdinalIgnoreCase).Trim();
        var match = Regex.Match(cleanName, @"^(\d{10,15})\s+([A-Z0-9\-\']+)(?:\s+([A-Z\s\.]+))?$", RegexOptions.IgnoreCase);
        
        if (match.Success)
        {
            return (match.Groups[1].Value, match.Groups[2].Value, match.Groups[3].Success ? match.Groups[3].Value.Trim() : "");
        }

        var parts = cleanName.Split(new[] { ' ', '_', '-' }, StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length >= 2 && parts[0].Length >= 6 && parts[0].Any(char.IsDigit))
        {
            return (parts[0], parts[1], parts.Length > 2 ? string.Join(" ", parts.Skip(2)) : "");
        }

        return ("", "", "");
    }
}
