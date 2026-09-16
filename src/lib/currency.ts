export interface Currency {
  code: string;
  name: string;
  symbol: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: "VND", name: "Vietnamese Dong", symbol: "₫", locale: "en-US" },
  { code: "MMK", name: "Myanmar Kyat", symbol: "K", locale: "en-US" },
  { code: "USD", name: "US Dollar", symbol: "$", locale: "en-US" },
  { code: "EUR", name: "Euro", symbol: "€", locale: "en-US" },
  { code: "GBP", name: "British Pound", symbol: "£", locale: "en-US" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", locale: "en-US" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", locale: "en-US" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", locale: "en-US" },
  { code: "THB", name: "Thai Baht", symbol: "฿", locale: "en-US" },
  { code: "KRW", name: "South Korean Won", symbol: "₩", locale: "en-US" },
];

const RATES_CACHE_KEY = "pocket_exchange_rates";
const RATES_TIMESTAMP_KEY = "pocket_exchange_rates_timestamp";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

// Static VND rates for currencies not covered by the exchange rate API.
// Value = how many VND per 1 unit of that currency.
// e.g. 1 MMK = 5.85 VND
const STATIC_VND_RATES: Record<string, number> = {
  MMK: 5.85,
};

export async function fetchExchangeRates(): Promise<Record<string, number> | null> {
  try {
    const cached = localStorage.getItem(RATES_CACHE_KEY);
    const timestamp = localStorage.getItem(RATES_TIMESTAMP_KEY);

    if (cached && timestamp) {
      const isExpired = Date.now() - Number(timestamp) > CACHE_TTL_MS;
      if (!isExpired) {
        return JSON.parse(cached);
      }
    }

    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!res.ok) throw new Error("Failed to fetch rates");

    const data = await res.json();
    const rates = data.rates;

    localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(rates));
    localStorage.setItem(RATES_TIMESTAMP_KEY, Date.now().toString());

    return rates;
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    // Fallback to cache even if expired if we are offline
    const cached = localStorage.getItem(RATES_CACHE_KEY);
    if (cached) return JSON.parse(cached);
    return null;
  }
}

// Assumes all stored numbers are conceptually in VND (the default app base)
export function convertAndFormatCurrency(
  amountInVND: number,
  targetCurrencyCode: string,
  rates: Record<string, number> | null
): string {
  const targetConfig = SUPPORTED_CURRENCIES.find(c => c.code === targetCurrencyCode) || SUPPORTED_CURRENCIES[0];
  let convertedAmount = amountInVND;

  if (targetCurrencyCode !== "VND") {
    // Static rates (user-defined) always take priority over the API
    if (STATIC_VND_RATES[targetCurrencyCode]) {
      convertedAmount = amountInVND / STATIC_VND_RATES[targetCurrencyCode];
    } else if (rates) {
      const vndRate = rates["VND"];
      const targetRate = rates[targetCurrencyCode];
      if (vndRate && targetRate) {
        // API rate: VND -> USD -> Target
        convertedAmount = (amountInVND / vndRate) * targetRate;
      }
    }
  }

  // Use explicit formatting for all to ensure consistent comma/dot formatting
  return new Intl.NumberFormat(targetConfig.locale, {
    style: "currency",
    currency: targetConfig.code,
    maximumFractionDigits: 2,
  }).format(convertedAmount);
}

// Convert amount in base VND to target currency as raw number
export function convertAmount(
  amountInVND: number,
  targetCurrencyCode: string,
  rates: Record<string, number> | null
): number {
  if (targetCurrencyCode === "VND") return amountInVND;

  // Static rates always win over API
  if (STATIC_VND_RATES[targetCurrencyCode]) {
    return amountInVND / STATIC_VND_RATES[targetCurrencyCode];
  }

  if (rates) {
    const vndRate = rates["VND"];
    const targetRate = rates[targetCurrencyCode];
    if (vndRate && targetRate) return (amountInVND / vndRate) * targetRate;
  }

  return amountInVND;
}

// Convert amount in active currency back to base VND for saving to database
export function convertToBaseVND(
  amount: number,
  fromCurrencyCode: string,
  rates: Record<string, number> | null
): number {
  if (fromCurrencyCode === "VND") return amount;

  // Static rates always win over API
  if (STATIC_VND_RATES[fromCurrencyCode]) {
    return Math.round(amount * STATIC_VND_RATES[fromCurrencyCode]);
  }

  if (rates) {
    const vndRate = rates["VND"];
    const fromRate = rates[fromCurrencyCode];
    if (vndRate && fromRate) return Math.round((amount / fromRate) * vndRate);
  }

  return amount;
}
