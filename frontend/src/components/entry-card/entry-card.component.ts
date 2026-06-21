import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import type { FinancialEntry } from '../../models/finance';

@Component({
  selector: 'app-entry-card',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, ButtonModule, CardModule],
  templateUrl: './entry-card.component.html',
  styleUrl: './entry-card.component.scss'
})
export class EntryCardComponent {
  @Input({ required: true }) entry!: FinancialEntry;
  @Input() allowRemove = true;
  @Input() allowEdit = false;
  @Output() edit = new EventEmitter<FinancialEntry>();
  @Output() remove = new EventEmitter<FinancialEntry>();
}
