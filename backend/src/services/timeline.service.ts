import currency from "currency.js";
import type { FinanceTimeline, MonthlyPoint } from "../models/finance.js";
import { getEntries, getSalary } from "../store.js";
import { enrichEntries } from "./entry.service.js";

function monthToIndex(month: string): number {
  const [year, monthNumber] = month.split("-").map(Number);
  return year * 12 + monthNumber - 1;
}

function indexToMonth(index: number): string {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export async function buildTimeline(): Promise<FinanceTimeline> {
  const [salary, storedEntries] = await Promise.all([
    getSalary(),
    getEntries(),
  ]);
  const entries = await enrichEntries(storedEntries);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const candidateMonths = entries.map((entry) => {
    return entry.date.slice(0, 7);
  });
  candidateMonths.push(
    ...salary.periods.map((period) => {
      return period.startDate.slice(0, 7);
    }),
  );

  if (!candidateMonths.length) {
    return { openingBalance: salary.openingBalance, points: [] };
  }

  const firstIndex = Math.min(...candidateMonths.map(monthToIndex));
  const lastIndex = Math.max(
    monthToIndex(currentMonth),
    ...candidateMonths.map(monthToIndex),
  );
  const currentIndex = monthToIndex(currentMonth);
  let runningBalance = currency(0);
  const points: MonthlyPoint[] = [];

  for (let index = firstIndex; index <= lastIndex; index += 1) {
    const month = indexToMonth(index);
    const monthNumber = Number(month.slice(5, 7));
    const monthStart = `${month}-01`;
    const year = Number(month.slice(0, 4));
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const monthEnd = `${month}-${String(lastDay).padStart(2, "0")}`;
    const activePeriods =
      index <= currentIndex
        ? salary.periods.filter((period) => {
            return period.startDate <= monthEnd && period.endDate >= monthStart;
          })
        : [];
    const monthlySalary = activePeriods.reduce((sum, period) => {
      return sum.add(period.monthlySalary);
    }, currency(0)).value;
    const extraPay =
      monthNumber === 6 || monthNumber === 12
        ? activePeriods.reduce((sum, period) => {
            return sum.add(period.extraPayAmount);
          }, currency(0)).value
        : 0;
    const monthEntries = entries.filter((entry) => {
      return entry.date.startsWith(month);
    });
    const oneOffIncome = monthEntries
      .filter((entry) => {
        return entry.type === "income";
      })
      .reduce((sum, entry) => {
        return sum.add(entry.euroAmount);
      }, currency(0)).value;
    const expenses = monthEntries
      .filter((entry) => {
        return entry.type === "expense";
      })
      .reduce((sum, entry) => {
        return sum.add(entry.euroAmount);
      }, currency(0)).value;
    const income = currency(monthlySalary)
      .add(extraPay)
      .add(oneOffIncome).value;
    const savings = currency(income).subtract(expenses).value;

    if (index === firstIndex) {
      runningBalance = runningBalance.add(salary.openingBalance);
    }
    runningBalance = runningBalance.add(savings);

    points.push({
      month,
      salary: monthlySalary,
      extraPay,
      oneOffIncome,
      income,
      expenses,
      savings,
      cumulativeBalance: runningBalance.value,
    });
  }

  return { openingBalance: salary.openingBalance, points };
}
