import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ConfirmationService, MessageService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { DatePickerModule } from "primeng/datepicker";
import { MessageModule } from "primeng/message";
import { DialogService, DynamicDialogModule } from "primeng/dynamicdialog";
import { catchError, finalize, forkJoin, of } from "rxjs";
import type {
  EntryType,
  FinanceTimeline,
  FinancialEntry,
  FinancialEntryInput,
  SalaryData,
  SalaryDataInput,
  SalaryPeriod,
} from "../../models/finance";
import { EntryDialogComponent } from "../../components/entry-dialog/entry-dialog.component";
import type { EntryDialogResult } from "../../components/entry-dialog/entry-dialog.models";
import { FinanceChartComponent } from "../../components/finance-chart/finance-chart.component";
import {
  FinanceColumnComponent,
  type FinanceColumnType,
} from "../../components/finance-column/finance-column.component";
import { SalaryDialogComponent } from "../../components/salary-dialog/salary-dialog.component";
import type { SalaryDialogResult } from "../../components/salary-dialog/salary-dialog.models";
import { FinanceService } from "../../services/finance.service";
import { ThemeService } from "../../services/theme.service";

@Component({
  selector: "app-dashboard-screen",
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    DatePickerModule,
    DynamicDialogModule,
    MessageModule,
    FinanceColumnComponent,
    FinanceChartComponent,
  ],
  providers: [DialogService],
  templateUrl: "./dashboard-screen.component.html",
  styleUrl: "./dashboard-screen.component.scss",
})
export class DashboardScreenComponent {
  private readonly financeService = inject(FinanceService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly dialogService = inject(DialogService);
  protected readonly themeService = inject(ThemeService);

  protected readonly salary = signal<SalaryData>({
    openingBalance: 0,
    periods: [],
  });
  protected readonly entries = signal<FinancialEntry[]>([]);
  protected readonly timeline = signal<FinanceTimeline>({
    openingBalance: 0,
    points: [],
  });
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal("");
  protected readonly incomeEntries = computed(() => {
    return this.entries().filter((entry) => {
      return entry.type === "income";
    });
  });
  protected readonly expenseEntries = computed(() => {
    return this.entries().filter((entry) => {
      return entry.type === "expense";
    });
  });

  protected selectedMonthDate = new Date();
  protected selectedMonth = this.toMonthKey(this.selectedMonthDate);

  constructor() {
    this.loadDashboard();
  }

  protected changeMonth(): void {
    this.selectedMonth = this.toMonthKey(this.selectedMonthDate);
    this.loadDashboard();
  }

  protected openSalaryDialog(period?: SalaryPeriod): void {
    const ref = this.dialogService.open(SalaryDialogComponent, {
      header: "Salary settings",
      width: "min(520px, 94vw)",
      modal: true,
      draggable: false,
      data: {
        salary: this.salary(),
        editPeriodId: period?.id,
      },
    });

    ref?.onClose.subscribe((result?: SalaryDialogResult) => {
      if (!result) return;
      if (result.action === "clear") {
        this.confirmClearSalary();
      } else {
        this.saveSalary(result.settings);
      }
    });
  }

  protected openEntryDialog(type: EntryType): void {
    const ref = this.dialogService.open(EntryDialogComponent, {
      header: type === "income" ? "Add one-off income" : "Add one-off expense",
      width: "min(520px, 94vw)",
      modal: true,
      draggable: false,
      data: { type, month: this.selectedMonth },
    });

    ref?.onClose.subscribe((result?: EntryDialogResult) => {
      if (result) this.saveEntry(result);
    });
  }

  protected handleAdd(type: FinanceColumnType): void {
    if (type === "salary") {
      this.openSalaryDialog();
    } else {
      this.openEntryDialog(type);
    }
  }

  protected removeEntry(entry: FinancialEntry): void {
    this.confirmationService.confirm({
      header: `Remove ${entry.type}?`,
      message: `Remove “${entry.name}” from ${entry.date}?`,
      icon: "pi pi-trash",
      acceptButtonProps: { label: "Remove", severity: "danger" },
      rejectButtonProps: {
        label: "Cancel",
        severity: "secondary",
        outlined: true,
      },
      accept: () => {
        this.financeService.deleteEntry(entry.id).subscribe({
          next: () => {
            return this.loadDashboard();
          },
          error: () => {
            return this.showError("Could not remove item", "Please try again.");
          },
        });
      },
    });
  }

  protected removeSalaryPeriod(period: SalaryPeriod): void {
    this.confirmationService.confirm({
      header: "Remove salary period?",
      message: `Remove the salary period from ${period.startDate} to ${period.endDate}?`,
      icon: "pi pi-trash",
      acceptButtonProps: { label: "Remove", severity: "danger" },
      rejectButtonProps: {
        label: "Cancel",
        severity: "secondary",
        outlined: true,
      },
      accept: () => {
        this.financeService.deleteSalaryPeriod(period.id).subscribe({
          next: () => {
            this.salary.update((salary) => {
              return {
                ...salary,
                periods: salary.periods.filter((item) => {
                  return item.id !== period.id;
                }),
              };
            });
            this.showSuccess(
              "Salary removed",
              "The salary period has been deleted.",
            );
            this.loadDashboard();
          },
          error: () => {
            return this.showError(
              "Could not remove salary",
              "Please try again.",
            );
          },
        });
      },
    });
  }

  private saveSalary(settings: SalaryDataInput): void {
    this.saving.set(true);
    this.financeService
      .saveSalary(settings)
      .pipe(
        finalize(() => {
          return this.saving.set(false);
        }),
      )
      .subscribe({
        next: (savedSalary) => {
          this.salary.set(savedSalary);
          this.showSuccess(
            "Salary saved",
            "Recurring income settings have been updated.",
          );
          this.loadDashboard();
        },
        error: () => {
          return this.showError(
            "Could not save salary",
            "Please check the entered values.",
          );
        },
      });
  }

  private confirmClearSalary(): void {
    this.confirmationService.confirm({
      header: "Clear salary settings?",
      message: "One-off income and expenses will remain untouched.",
      icon: "pi pi-exclamation-triangle",
      acceptButtonProps: { label: "Clear", severity: "danger" },
      rejectButtonProps: {
        label: "Cancel",
        severity: "secondary",
        outlined: true,
      },
      accept: () => {
        this.financeService.clearSalary().subscribe({
          next: () => {
            return this.loadDashboard();
          },
          error: () => {
            return this.showError(
              "Could not clear settings",
              "Please try again.",
            );
          },
        });
      },
    });
  }

  private saveEntry(input: FinancialEntryInput): void {
    this.saving.set(true);
    this.financeService
      .createEntry(input)
      .pipe(
        finalize(() => {
          return this.saving.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.showSuccess(
            input.type === "income" ? "Income added" : "Expense added",
            "The entry has been added and its EUR value will be calculated live.",
          );
          this.loadDashboard();
        },
        error: () => {
          return this.showError(
            "Could not add entry",
            "The currency could not be converted or the entered data is invalid.",
          );
        },
      });
  }

  private loadDashboard(): void {
    this.loading.set(true);
    this.error.set("");
    forkJoin({
      salary: this.financeService.getSalary().pipe(
        catchError(() => {
          this.error.set("Salary data could not be refreshed.");
          return of(this.salary());
        }),
      ),
      entries: this.financeService.getEntries(this.selectedMonth).pipe(
        catchError(() => {
          this.error.set("Some dashboard data could not be refreshed.");
          return of(this.entries());
        }),
      ),
      timeline: this.financeService.getTimeline().pipe(
        catchError(() => {
          this.error.set("The chart could not be refreshed.");
          return of(this.timeline());
        }),
      ),
    })
      .pipe(
        finalize(() => {
          return this.loading.set(false);
        }),
      )
      .subscribe({
        next: ({ salary, entries, timeline }) => {
          this.salary.set(salary);
          this.entries.set(entries);
          this.timeline.set(timeline);
        },
      });
  }

  private showSuccess(summary: string, detail: string): void {
    this.messageService.add({ severity: "success", summary, detail });
  }

  private showError(summary: string, detail: string): void {
    this.messageService.add({ severity: "error", summary, detail });
  }

  private toMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
}
