export interface SalaryPeriod {
  id: string;
  monthlySalary: number;
  extraPayAmount: number;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export type SalaryPeriodInput = Pick<
  SalaryPeriod,
  'monthlySalary' | 'extraPayAmount' | 'startDate' | 'endDate'
>;

export interface SalaryData {
  openingBalance: number;
  periods: SalaryPeriod[];
}

export interface SalaryDataInput {
  openingBalance: number;
  periods: Array<SalaryPeriodInput & { id?: string; createdAt?: string }>;
}

export type EntryType = 'income' | 'expense';

export interface FinancialEntry {
  id: string;
  type: EntryType;
  name: string;
  amount: number;
  description: string;
  currency: string;
  date: string;
  createdAt: string;
  euroAmount: number;
}

export type FinancialEntryInput = Pick<
  FinancialEntry,
  'type' | 'name' | 'amount' | 'description' | 'currency' | 'date'
>;

export interface MonthlyPoint {
  month: string;
  salary: number;
  extraPay: number;
  oneOffIncome: number;
  income: number;
  expenses: number;
  savings: number;
  cumulativeBalance: number;
}

export interface FinanceTimeline {
  openingBalance: number;
  points: MonthlyPoint[];
}
