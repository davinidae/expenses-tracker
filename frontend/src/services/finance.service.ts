import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  EntryType,
  FinanceTimeline,
  FinancialEntry,
  FinancialEntryInput,
  SalaryData,
  SalaryDataInput
} from '../models/finance';

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api';

  getSalary() {
    return this.http.get<SalaryData>(`${this.apiUrl}/salary`);
  }

  saveSalary(settings: SalaryDataInput) {
    return this.http.put<SalaryData>(`${this.apiUrl}/salary`, settings);
  }

  clearSalary() {
    return this.http.delete<void>(`${this.apiUrl}/salary`);
  }

  deleteSalaryPeriod(id: string) {
    return this.http.delete<void>(`${this.apiUrl}/salary/${id}`);
  }

  getEntries(month?: string, type?: EntryType) {
    let params = new HttpParams();
    if (month) params = params.set('month', month);
    if (type) params = params.set('type', type);
    return this.http.get<FinancialEntry[]>(`${this.apiUrl}/entries`, { params });
  }

  createEntry(input: FinancialEntryInput) {
    return this.http.post<FinancialEntry>(`${this.apiUrl}/entries`, input);
  }

  updateEntry(id: string, input: FinancialEntryInput) {
    return this.http.put<FinancialEntry>(`${this.apiUrl}/entries/${id}`, input);
  }

  deleteEntry(id: string) {
    return this.http.delete<void>(`${this.apiUrl}/entries/${id}`);
  }

  getTimeline() {
    return this.http.get<FinanceTimeline>(`${this.apiUrl}/timeline`);
  }
}
