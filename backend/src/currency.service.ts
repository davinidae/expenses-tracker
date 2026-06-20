import currency from "currency.js";

interface ExchangeRateResponse {
  rate: number;
}

const rateCache = new Map<string, { rate: number; expiresAt: number }>();
const cacheDuration = 5 * 60 * 1000;

async function getEuroRate(sourceCurrency: string): Promise<number> {
  if (sourceCurrency === "EUR") return 1;
  const cached = rateCache.get(sourceCurrency);
  if (cached && cached.expiresAt > Date.now()) return cached.rate;
  const response = await fetch(
    `https://api.frankfurter.dev/v2/rate/${encodeURIComponent(sourceCurrency)}/EUR?providers=ECB`,
  );
  if (!response.ok) {
    throw new Error(`Could not convert ${sourceCurrency} to EUR`);
  }
  const data = (await response.json()) as ExchangeRateResponse;
  if (!Number.isFinite(data.rate) || data.rate <= 0) {
    throw new Error(`Invalid exchange rate for ${sourceCurrency}`);
  }
  rateCache.set(sourceCurrency, {
    rate: data.rate,
    expiresAt: Date.now() + cacheDuration,
  });
  return data.rate;
}

export async function convertToEuro(
  amount: number,
  sourceCurrency: string,
): Promise<number> {
  const rate = await getEuroRate(sourceCurrency);
  return currency(amount).multiply(rate).value;
}
