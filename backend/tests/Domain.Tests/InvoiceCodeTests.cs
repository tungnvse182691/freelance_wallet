using FreelanceWallet.Api.Services;

public class InvoiceCodeTests
{
    [Fact]
    public void Next_SequentialPerYear_AndResetsOnNewYear()
    {
        Assert.Equal("INV-2026-002", InvoiceCodeService.Next(new[] { "INV-2026-001" }, 2026));
        Assert.Equal("INV-2027-001", InvoiceCodeService.Next(new[] { "INV-2026-001", "INV-2026-002" }, 2027));
        Assert.Equal("INV-2026-001", InvoiceCodeService.Next(Array.Empty<string>(), 2026));
    }
}
