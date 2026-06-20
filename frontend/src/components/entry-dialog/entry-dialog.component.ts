import { Component, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import type { EntryType, FinancialEntryInput } from '../../models/finance';
import type { EntryDialogData } from './entry-dialog.models';

interface CurrencyOption {
  code: string;
  name: string;
}

@Component({
  selector: 'app-entry-dialog',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    DatePickerModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TextareaModule
  ],
  templateUrl: './entry-dialog.component.html',
  styleUrl: './entry-dialog.component.scss'
})
export class EntryDialogComponent {
  private readonly ref = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig<EntryDialogData>);

  protected readonly type: EntryType = this.config.data?.type ?? 'income';
  protected readonly month = this.config.data?.month ?? new Date().toISOString().slice(0, 7);
  protected entryDate = this.defaultDate();
  protected model = this.emptyModel();
  protected readonly currencies: CurrencyOption[] = [
    { code: 'EUR', name: 'Euro' },
    { code: 'USD', name: 'US Dollar' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'CHF', name: 'Swiss Franc' },
    { code: 'JPY', name: 'Japanese Yen' },
    { code: 'CAD', name: 'Canadian Dollar' },
    { code: 'AUD', name: 'Australian Dollar' },
    { code: 'CNY', name: 'Chinese Yuan' },
    { code: 'SEK', name: 'Swedish Krona' },
    { code: 'NOK', name: 'Norwegian Krone' },
    { code: 'DKK', name: 'Danish Krone' },
    { code: 'PLN', name: 'Polish Zloty' },
    { code: 'CZK', name: 'Czech Koruna' }
  ];

  protected submit(form: NgForm): void {
    if (form.invalid) return;
    this.ref.close({
      ...this.model,
      date: this.toDateKey(this.entryDate),
      name: this.model.name.trim(),
      description: this.model.description.trim()
    });
  }

  protected close(): void {
    this.ref.close();
  }

  private emptyModel(): FinancialEntryInput {
    return {
      type: this.type,
      name: '',
      amount: 0,
      description: '',
      currency: 'EUR',
      date: this.toDateKey(this.entryDate)
    };
  }

  private defaultDate(): Date {
    const [year, monthNumber] = this.month.split('-').map(Number);
    const now = new Date();
    const day = now.getFullYear() === year && now.getMonth() === monthNumber - 1
      ? now.getDate()
      : 1;
    return new Date(year, monthNumber - 1, day);
  }

  private toDateKey(date: Date): string {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }
}
