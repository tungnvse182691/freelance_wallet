using FreelanceWallet.Domain.Entities;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace FreelanceWallet.Api.Pdf;

public static class InvoiceTemplate
{
    public static byte[] Render(Invoice inv, Project p, Client c, string freelancerName, string freelancerContact)
    {
        QuestPDF.Settings.License = LicenseType.Community;
        return Document.Create(doc =>
        {
            doc.Page(page =>
            {
                page.Margin(40);
                page.Header().Row(r =>
                {
                    r.RelativeItem().Column(col =>
                    {
                        col.Item().Text("FREELANCE WALLET").Bold().FontSize(18);
                        col.Item().Text($"{freelancerName} | {freelancerContact}");
                    });
                    r.ConstantItem(140).AlignRight().Text(inv.Code).Bold().FontSize(14);
                });
                page.Content().PaddingVertical(16).Column(col =>
                {
                    col.Item().Text($"Khách hàng: {c.Name}");
                    if (!string.IsNullOrWhiteSpace(c.BankAccount))
                        col.Item().Text($"STK: {c.BankAccount}");
                    col.Item().PaddingTop(12).Table(t =>
                    {
                        t.ColumnsDefinition(cd => { cd.RelativeColumn(3); cd.RelativeColumn(1); });
                        t.Header(h => { h.Cell().Text("Nội dung").Bold(); h.Cell().AlignRight().Text("Số tiền").Bold(); });
                        t.Cell().Text(p.Title);
                        t.Cell().AlignRight().Text($"{p.Price:N0} đ");
                        t.Cell().Text("Tổng cộng").Bold();
                        t.Cell().AlignRight().Text($"{p.Price:N0} đ").Bold();
                    });
                });
                page.Footer().AlignCenter().Text($"Cảm ơn quý khách! Mã: {inv.Code}");
            });
        }).GeneratePdf();
    }
}
