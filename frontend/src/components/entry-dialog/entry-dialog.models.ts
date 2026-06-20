import type { EntryType, FinancialEntryInput } from '../../models/finance';

export interface EntryDialogData {
  type: EntryType;
  month: string;
}

export type EntryDialogResult = FinancialEntryInput;
