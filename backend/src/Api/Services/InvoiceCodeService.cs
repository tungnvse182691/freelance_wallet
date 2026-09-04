using System.Text.RegularExpressions;

namespace FreelanceWallet.Api.Services;

public static partial class InvoiceCodeService
{
    public static string Next(IEnumerable<string> existingCodes, int year)
    {
        var max = existingCodes.Select(c => CodeNumber().Match(c))
            .Where(m => m.Success && int.Parse(m.Groups["y"].Value) == year)
            .Select(m => int.Parse(m.Groups["n"].Value))
            .DefaultIfEmpty(0).Max();
        return $"INV-{year}-{(max + 1):D3}";
    }

    [GeneratedRegex(@"^INV-(?<y>\d{4})-(?<n>\d{3,})$")]
    private static partial Regex CodeNumber();
}
