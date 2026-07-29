using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace brokerApp.API.Services;

public class PdfService : IPdfService
{
    static PdfService()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public byte[] GenerateAdvisorPayslipPdf(
        string advisorName,
        string advisorCode,
        string advisorEmail,
        string statementName,
        DateTime statementDate,
        IEnumerable<PayslipItemDto> items)
    {
        var itemList = items.ToList();

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(25);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(8.5f).FontFamily("Arial"));

                page.Header().Element(headerContainer => ComposeHeader(headerContainer, statementName, statementDate));
                page.Content().Element(contentContainer => ComposePayslipBody(contentContainer, advisorName, advisorCode, advisorEmail, itemList));
                page.Footer().Element(ComposeFooter);
            });
        });

        return document.GeneratePdf();
    }

    public byte[] GenerateBulkPayslipsPdf(
        string statementName,
        DateTime statementDate,
        IEnumerable<GroupedPayslipDto> groupedPayslips)
    {
        var payslipList = groupedPayslips.ToList();

        var document = Document.Create(container =>
        {
            foreach (var group in payslipList)
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4.Landscape());
                    page.Margin(25);
                    page.PageColor(Colors.White);
                    page.DefaultTextStyle(x => x.FontSize(8.5f).FontFamily("Arial"));

                    page.Header().Element(headerContainer => ComposeHeader(headerContainer, statementName, statementDate));
                    page.Content().Element(contentContainer => ComposePayslipBody(contentContainer, group.AdvisorName, group.AdvisorCode, group.AdvisorEmail, group.Items));
                    page.Footer().Element(ComposeFooter);
                });
            }
        });

        return document.GeneratePdf();
    }

    private void ComposeHeader(IContainer container, string statementName, DateTime statementDate)
    {
        container.Row(row =>
        {
            row.RelativeItem().Column(column =>
            {
                column.Item().Text("BROKERAPP FINANCIALS").FontSize(13).SemiBold().FontColor(Colors.Blue.Darken3);
                column.Item().Text("COMMISSION PAYSLIP & SETTLEMENT").FontSize(8.5f).FontColor(Colors.Grey.Darken1);
            });

            row.RelativeItem().AlignRight().Column(column =>
            {
                column.Item().Text($"Statement: {statementName}").FontSize(8.5f).Bold();
                column.Item().Text($"Date: {statementDate:dd MMMM yyyy}").FontSize(8f).FontColor(Colors.Grey.Darken1);
            });
        });
    }

    private void ComposePayslipBody(IContainer container, string name, string code, string email, List<PayslipItemDto> items)
    {
        container.PaddingVertical(15).Column(column =>
        {
            // Advisor Details & Summary Header Card
            column.Item().Background(Colors.Grey.Lighten4).Padding(12).Row(row =>
            {
                row.RelativeItem().Column(col =>
                {
                    col.Item().Text("ADVISOR DETAILS").FontSize(8).Bold().FontColor(Colors.Grey.Darken2);
                    col.Item().Text(name).FontSize(13).Bold().FontColor(Colors.Blue.Darken4);
                    col.Item().Text($"Code: {code} | Email: {email}").FontSize(9).FontColor(Colors.Grey.Darken1);
                });

                var totalGross = items.Sum(i => i.GrossCommission);
                var totalRetention = items.Sum(i => i.CommissionRetention);
                var totalClawback = items.Sum(i => i.ClawBackGross);
                var totalClawbackRetention = items.Sum(i => i.ClawBackRetention);
                var netPayout = items.Sum(i => i.CommissionAmount);

                row.RelativeItem().AlignRight().Column(col =>
                {
                    col.Item().Text("NET PAYOUT AMOUNT").FontSize(8).Bold().FontColor(Colors.Grey.Darken2);
                    col.Item().Text($"R {netPayout:N2}").FontSize(16).Bold().FontColor(netPayout >= 0 ? Colors.Green.Darken2 : Colors.Red.Darken2);
                    col.Item().Text($"Gross: R {totalGross:N2} | Ret: R {totalRetention:N2} | CB: R {totalClawback:N2} | CB(R): R {totalClawbackRetention:N2}").FontSize(8).FontColor(Colors.Grey.Darken1);
                });
            });

            column.Item().Height(15);

            // Table of Commission Items
            column.Item().Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn(3); // Client / Ref
                    columns.RelativeColumn(2); // Policy No
                    columns.RelativeColumn(2); // Product
                    columns.RelativeColumn(2); // Premium
                    columns.RelativeColumn(2); // Gross
                    columns.RelativeColumn(2); // Retention
                    columns.RelativeColumn(2); // Clawback (G)
                    columns.RelativeColumn(2); // Clawback (R)
                    columns.RelativeColumn(2); // Net Commission
                });

                table.Header(header =>
                {
                    header.Cell().Background(Colors.Blue.Darken3).Padding(5).Text("Client / Reference").FontColor(Colors.White).Bold();
                    header.Cell().Background(Colors.Blue.Darken3).Padding(5).Text("Policy #").FontColor(Colors.White).Bold();
                    header.Cell().Background(Colors.Blue.Darken3).Padding(5).Text("Product").FontColor(Colors.White).Bold();
                    header.Cell().Background(Colors.Blue.Darken3).Padding(5).AlignRight().Text("Premium").FontColor(Colors.White).Bold();
                    header.Cell().Background(Colors.Blue.Darken3).Padding(5).AlignRight().Text("Gross").FontColor(Colors.White).Bold();
                    header.Cell().Background(Colors.Blue.Darken3).Padding(5).AlignRight().Text("Retention").FontColor(Colors.White).Bold();
                    header.Cell().Background(Colors.Blue.Darken3).Padding(5).AlignRight().Text("Clawback(G)").FontColor(Colors.White).Bold();
                    header.Cell().Background(Colors.Blue.Darken3).Padding(5).AlignRight().Text("Clawback(R)").FontColor(Colors.White).Bold();
                    header.Cell().Background(Colors.Blue.Darken3).Padding(5).AlignRight().Text("Nett").FontColor(Colors.White).Bold();
                });

                bool isEven = false;
                foreach (var item in items)
                {
                    var bg = isEven ? Colors.Grey.Lighten5 : Colors.White;
                    isEven = !isEven;

                    table.Cell().Background(bg).Padding(5).Text(string.IsNullOrEmpty(item.ClientName) ? item.PayoutReference : item.ClientName);
                    table.Cell().Background(bg).Padding(5).Text(item.PolicyNumber);
                    table.Cell().Background(bg).Padding(5).Text(item.Product);
                    table.Cell().Background(bg).Padding(5).AlignRight().Text($"R {item.Premium:N2}");
                    table.Cell().Background(bg).Padding(5).AlignRight().Text($"R {item.GrossCommission:N2}");
                    table.Cell().Background(bg).Padding(5).AlignRight().Text($"R {item.CommissionRetention:N2}");
                    table.Cell().Background(bg).Padding(5).AlignRight().Text($"R {item.ClawBackGross:N2}");
                    table.Cell().Background(bg).Padding(5).AlignRight().Text($"R {item.ClawBackRetention:N2}");
                    table.Cell().Background(bg).Padding(5).AlignRight().Text($"R {item.CommissionAmount:N2}").Bold();
                }
            });
        });
    }

    private void ComposeFooter(IContainer container)
    {
        container.BorderTop(1).BorderColor(Colors.Grey.Lighten2).PaddingTop(5).Row(row =>
        {
            row.RelativeItem().Text($"Generated on {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC - Confidential").FontSize(8).FontColor(Colors.Grey.Darken1);
            row.RelativeItem().AlignRight().Text(x =>
            {
                x.Span("Page ");
                x.CurrentPageNumber();
                x.Span(" of ");
                x.TotalPages();
            });
        });
    }
}
