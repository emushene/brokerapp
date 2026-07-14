using System;
using System.IO;
using ClosedXML.Excel;

class Program
{
    static void Main(string[] args)
    {
        var filePath = "../Jospet.xlsx";
        if (!File.Exists(filePath))
        {
            Console.WriteLine($"File not found: {Path.GetFullPath(filePath)}");
            return;
        }

        try
        {
            using var workbook = new XLWorkbook(filePath);
            Console.WriteLine($"Workbook loaded successfully: {filePath}");
            Console.WriteLine($"Number of worksheets: {workbook.Worksheets.Count}");

            foreach (var ws in workbook.Worksheets)
            {
                Console.WriteLine($"----------------------------------------");
                Console.WriteLine($"Worksheet Name: '{ws.Name}'");
                var lastRow = ws.LastRowUsed()?.RowNumber() ?? 0;
                var lastCol = ws.LastColumnUsed()?.ColumnNumber() ?? 0;
                Console.WriteLine($"Used range: Rows 1 to {lastRow}, Cols 1 to {lastCol}");

                // Read first 5 rows
                for (int r = 1; r <= Math.Min(10, lastRow); r++)
                {
                    var row = ws.Row(r);
                    var cells = new System.Collections.Generic.List<string>();
                    for (int c = 1; c <= lastCol; c++)
                    {
                        cells.Add(row.Cell(c).Value.ToString());
                    }
                    Console.WriteLine($"Row {r}: {string.Join(" | ", cells)}");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"ERROR: {ex.Message}");
        }
    }
}
