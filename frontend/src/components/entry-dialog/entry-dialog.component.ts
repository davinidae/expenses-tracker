import { Component, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import type { EntryType, FinancialEntryInput } from '../../models/finance';
import { CURRENCIES } from '../../constants/currencies';
import { ConfirmDialogDismissDirective } from '../../directives/confirm-dialog-dismiss.directive';
import { MoneyInputDirective } from '../../directives/money-input.directive';
import type { EntryDialogData } from './entry-dialog.models';

@Component({
  selector: 'app-entry-dialog',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    DatePickerModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TextareaModule,
    ConfirmDialogDismissDirective,
    MoneyInputDirective
  ],
  templateUrl: './entry-dialog.component.html',
  styleUrl: './entry-dialog.component.scss'
})
export class EntryDialogComponent {
  private readonly ref = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig<EntryDialogData>);

  protected readonly type: EntryType = this.config.data?.type ?? 'income';
  protected readonly month = this.config.data?.month ?? new Date().toISOString().slice(0, 7);
  protected readonly existingEntry = this.config.data?.entry;
  protected entryDate = this.existingEntry
    ? this.fromDateKey(this.existingEntry.date)
    : this.defaultDate();
  protected model = this.emptyModel();
  protected readonly currencies = CURRENCIES;

  protected submit(form: NgForm): void {
    if (form.invalid) return;
    this.ref.close({
      id: this.existingEntry?.id,
      input: {
        ...this.model,
        date: this.toDateKey(this.entryDate),
        name: this.model.name.trim(),
        description: this.model.description.trim()
      }
    });
  }

  protected close(): void {
    this.ref.close();
  }

  private emptyModel(): FinancialEntryInput {
    if (this.existingEntry) {
      return {
        type: this.existingEntry.type,
        name: this.existingEntry.name,
        amount: this.existingEntry.amount,
        description: this.existingEntry.description,
        currency: this.existingEntry.currency,
        date: this.existingEntry.date
      };
    }
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

  private fromDateKey(date: string): Date {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
}
