import { CurrencyPipe, DatePipe } from "@angular/common";
import { Component, inject } from "@angular/core";
import { FormsModule, NgForm } from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { DatePickerModule } from "primeng/datepicker";
import { DynamicDialogConfig, DynamicDialogRef } from "primeng/dynamicdialog";
import { InputNumberModule } from "primeng/inputnumber";
import type {
  SalaryData,
  SalaryDataInput,
  SalaryPeriod,
  SalaryPeriodInput,
} from "../../models/finance";
import type {
  SalaryDialogData,
  SalaryDialogResult,
} from "./salary-dialog.models";

@Component({
  selector: "app-salary-dialog",
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    ButtonModule,
    CardModule,
    DatePickerModule,
    InputNumberModule,
  ],
  templateUrl: "./salary-dialog.component.html",
  styleUrl: "./salary-dialog.component.scss",
})
export class SalaryDialogComponent {
  private readonly ref = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig<SalaryDialogData>);

  protected model: SalaryDataInput = this.cloneData(
    this.config.data?.salary ?? { openingBalance: 0, periods: [] },
  );
  protected periodModel: SalaryPeriodInput = this.emptyPeriod();
  protected startDate = new Date();
  protected endDate = new Date();
  protected editingId: string | null = null;

  constructor() {
    const editPeriodId = this.config.data?.editPeriodId;
    const selectedPeriod = this.model.periods.find((period) => {
      return period.id === editPeriodId;
    });
    if (selectedPeriod) this.editPeriod(selectedPeriod);
  }

  protected savePeriod(form: NgForm): void {
    if (form.invalid || this.endDate < this.startDate) return;
    const period = {
      ...this.periodModel,
      startDate: this.toDateKey(this.startDate),
      endDate: this.toDateKey(this.endDate),
    };

    if (this.editingId) {
      const index = this.model.periods.findIndex((item) => {
        return item.id === this.editingId;
      });
      if (index !== -1) {
        this.model.periods[index] = {
          ...this.model.periods[index],
          ...period,
        };
      }
    } else {
      this.model.periods.push({
        ...period,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      });
    }
    this.resetPeriodForm(form);
  }

  protected editPeriod(period: SalaryDataInput["periods"][number]): void {
    this.editingId = period.id ?? null;
    this.periodModel = {
      monthlySalary: period.monthlySalary,
      extraPayAmount: period.extraPayAmount,
      startDate: period.startDate,
      endDate: period.endDate,
    };
    this.startDate = this.fromDateKey(period.startDate);
    this.endDate = this.fromDateKey(period.endDate);
  }

  protected removePeriod(period: SalaryDataInput["periods"][number]): void {
    this.model.periods = this.model.periods.filter((item) => {
      return period.id ? item.id !== period.id : item !== period;
    });
    if (period.id && this.editingId === period.id) this.cancelPeriodEdit();
  }

  protected cancelPeriodEdit(): void {
    this.editingId = null;
    this.periodModel = this.emptyPeriod();
    this.startDate = new Date();
    this.endDate = new Date();
  }

  protected submit(): void {
    if (this.hasPendingPeriod()) {
      this.commitPendingPeriod();
    }
    const result: SalaryDialogResult = {
      action: "save",
      settings: this.model,
    };
    this.ref.close(result);
  }

  protected close(): void {
    this.ref.close();
  }

  protected clear(): void {
    this.ref.close({ action: "clear" } satisfies SalaryDialogResult);
  }

  private resetPeriodForm(form: NgForm): void {
    this.cancelPeriodEdit();
    form.resetForm(this.periodModel);
  }

  private hasPendingPeriod(): boolean {
    return (
      this.periodModel.monthlySalary > 0 || this.periodModel.extraPayAmount > 0
    );
  }

  private commitPendingPeriod(): void {
    if (this.endDate < this.startDate) return;
    const period = {
      ...this.periodModel,
      startDate: this.toDateKey(this.startDate),
      endDate: this.toDateKey(this.endDate),
    };

    if (this.editingId) {
      const index = this.model.periods.findIndex((item) => {
        return item.id === this.editingId;
      });
      if (index !== -1) {
        this.model.periods[index] = {
          ...this.model.periods[index],
          ...period,
        };
      }
    } else {
      this.model.periods.push({
        ...period,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      });
    }
  }

  private cloneData(data: SalaryData): SalaryDataInput {
    return {
      openingBalance: data.openingBalance,
      periods: data.periods.map((period: SalaryPeriod) => {
        return { ...period };
      }),
    };
  }

  private emptyPeriod(): SalaryPeriodInput {
    const today = this.toDateKey(new Date());
    return {
      monthlySalary: 0,
      extraPayAmount: 0,
      startDate: today,
      endDate: today,
    };
  }

  private toDateKey(date: Date): string {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  private fromDateKey(date: string): Date {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
}
