import type {
  EntryType,
  FinancialEntry,
  FinancialEntryInput
} from '../../models/finance';

export interface EntryDialogData {
  type: EntryType;
  month: string;
  entry?: FinancialEntry;
}

export interface EntryDialogResult {
  id?: string;
  input: FinancialEntryInput;
}
