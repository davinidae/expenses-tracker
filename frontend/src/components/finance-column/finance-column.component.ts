import { CurrencyPipe } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import type {
  EntryType,
  FinancialEntry,
  SalaryData,
  SalaryPeriod,
} from "../../models/finance";
import { EntryCardComponent } from "../entry-card/entry-card.component";

export type FinanceColumnType = "salary" | EntryType;

@Component({
  selector: "app-finance-column",
  standalone: true,
  imports: [CurrencyPipe, ButtonModule, CardModule, EntryCardComponent],
  templateUrl: "./finance-column.component.html",
  styleUrl: "./finance-column.component.scss",
})
export class FinanceColumnComponent {
  @Input({ required: true }) type: FinanceColumnType = "income";
  @Input({ required: true }) month = "";
  @Input() entries: FinancialEntry[] = [];
  @Input() salary: SalaryData = { openingBalance: 0, periods: [] };
  @Input() allowAdd = false;
  @Input() allowRemove = false;
  @Input() allowEdit = false;

  @Output() add = new EventEmitter<FinanceColumnType>();
  @Output() edit = new EventEmitter<SalaryPeriod>();
  @Output() editEntry = new EventEmitter<FinancialEntry>();
  @Output() remove = new EventEmitter<FinancialEntry>();
  @Output() removeSalary = new EventEmitter<SalaryPeriod>();

  protected get title(): string {
    if (this.type === "salary") return "Salary & extra pay";
    return this.type === "income" ? "Income" : "Expenses";
  }

  protected get total(): number {
    return this.entries.reduce((sum, entry) => {
      return sum + entry.euroAmount;
    }, 0);
  }

  protected get emptyIcon(): string {
    return this.type === "income" ? "pi-wallet" : "pi-receipt";
  }

  protected get activeSalaryPeriods(): SalaryPeriod[] {
    const monthNumber = Number(this.month.slice(5, 7));
    const year = Number(this.month.slice(0, 4));
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const monthStart = `${this.month}-01`;
    const monthEnd = `${this.month}-${String(lastDay).padStart(2, "0")}`;
    return this.salary.periods.filter((period) => {
      return period.startDate <= monthEnd && period.endDate >= monthStart;
    });
  }

  protected requestAdd(): void {
    this.add.emit(this.type);
  }
}
