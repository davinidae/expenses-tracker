import type { SalaryData, SalaryDataInput } from '../../models/finance';

export interface SalaryDialogData {
  salary: SalaryData;
  editPeriodId?: string;
}

export type SalaryDialogResult =
  | { action: 'save'; settings: SalaryDataInput }
  | { action: 'clear' };
