export interface SalaryPeriod {
  id: string;
  companyName: string;
  positionDescription: string;
  currency: string;
  monthlySalary: number;
  extraPayAmount: number;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export type SalaryPeriodInput = Pick<
  SalaryPeriod,
  | 'companyName'
  | 'positionDescription'
  | 'currency'
  | 'monthlySalary'
  | 'extraPayAmount'
  | 'startDate'
  | 'endDate'
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

export interface StoredFinancialEntry {
  id: string;
  type: EntryType;
  name: string;
  amount: number;
  description: string;
  currency: string;
  date: string;
  createdAt: string;
}

export interface FinancialEntry extends StoredFinancialEntry {
  euroAmount: number;
}

export type FinancialEntryInput = Pick<
  StoredFinancialEntry,
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
