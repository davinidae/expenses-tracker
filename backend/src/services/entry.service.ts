import { convertToEuro } from '../currency.service.js';
import type { FinancialEntry, StoredFinancialEntry } from '../models/finance.js';

export async function enrichEntry(entry: StoredFinancialEntry): Promise<FinancialEntry> {
  return {
    ...entry,
    euroAmount: await convertToEuro(entry.amount, entry.currency)
  };
}

export async function enrichEntries(
  entries: StoredFinancialEntry[]
): Promise<FinancialEntry[]> {
  return Promise.all(entries.map(enrichEntry));
}
