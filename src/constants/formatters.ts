const CURRENCY_LOCALE: Record<string, string> = {
	NGN: "en-NG",
	USD: "en-US",
	GBP: "en-GB",
	EUR: "de-DE",
};

const CURRENCY_SYMBOL: Record<string, string> = {
	NGN: "₦",
	USD: "$",
	GBP: "£",
	EUR: "€",
};

export function getCurrencySymbol(currency: string): string {
	return CURRENCY_SYMBOL[currency] ?? "";
}

export function formatMoney(amount: number, currency = "NGN"): string {
	const locale = CURRENCY_LOCALE[currency] ?? "en-NG";
	const symbol = CURRENCY_SYMBOL[currency] ?? "";
	const negative = amount < 0;
	const abs = Math.abs(amount);
	const formatted = abs.toLocaleString(locale, {
		maximumFractionDigits: 0,
	});
	return `${negative ? "-" : ""}${symbol}${formatted}`;
}

export function formatDateValue(
	value: Date | string,
	format = "DD/MM/YYYY",
): string {
	const d = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(d.getTime())) return "";
	const dd = String(d.getDate()).padStart(2, "0");
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const yyyy = String(d.getFullYear());
	switch (format) {
		case "MM/DD/YYYY":
			return `${mm}/${dd}/${yyyy}`;
		case "YYYY-MM-DD":
			return `${yyyy}-${mm}-${dd}`;
		default:
			return `${dd}/${mm}/${yyyy}`;
	}
}
