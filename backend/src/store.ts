import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  EntryType,
  FinancialEntryInput,
  SalaryData,
  SalaryDataInput,
  SalaryPeriod,
  StoredFinancialEntry,
} from "./models/finance.js";

interface LegacyExpense {
  id?: string;
  title?: string;
  amount?: number;
  date?: string;
  createdAt?: string;
}

interface LegacyFinanceStore {
  salary?: {
    monthlySalary?: number;
    openingBalance?: number;
    startMonth?: string;
    extraPayAmount?: number;
  } | null;
  entries?: Array<Record<string, unknown>>;
}

type CsvRow = Record<string, string>;

const databaseDirectory = process.env["DATABASE_DIR"]
  ? path.resolve(process.env["DATABASE_DIR"])
  : path.resolve(process.cwd(), "../database");
const salaryFile = path.join(databaseDirectory, "salary.csv");
const incomeFile = path.join(databaseDirectory, "income.csv");
const expenseFile = path.join(databaseDirectory, "expenses.csv");
const legacyFinanceFile = path.join(databaseDirectory, "finance.json");
const legacyExpensesFile = path.join(databaseDirectory, "legacy-expenses.json");

const salaryHeaders = [
  "recordType",
  "id",
  "companyName",
  "positionDescription",
  "currency",
  "amount",
  "monthlySalary",
  "extraPayAmount",
  "startDate",
  "endDate",
  "createdAt",
] as const;

const entryHeaders = [
  "id",
  "name",
  "amount",
  "description",
  "currency",
  "date",
  "createdAt",
] as const;

function escapeCsv(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function serializeCsv(headers: readonly string[], rows: CsvRow[]): string {
  const lines = [
    headers.join(","),
    ...rows.map((row) => {
      return headers
        .map((header) => {
          return escapeCsv(row[header] ?? "");
        })
        .join(",");
    }),
  ];
  return `${lines.join("\n")}\n`;
}

function parseCsv(contents: string): CsvRow[] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < contents.length; index += 1) {
    const character = contents[index];
    const next = contents[index + 1];

    if (quoted) {
      if (character === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      record.push(field);
      field = "";
    } else if (character === "\n") {
      record.push(field.replace(/\r$/, ""));
      if (
        record.some((value) => {
          return value.length > 0;
        })
      )
        records.push(record);
      record = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field.length || record.length) {
    record.push(field.replace(/\r$/, ""));
    records.push(record);
  }

  const [headers, ...rows] = records;
  if (!headers) return [];
  return rows.map((values) => {
    return Object.fromEntries(
      headers.map((header, index) => {
        return [header, values[index] ?? ""];
      }),
    );
  });
}

async function fileExists(file: string): Promise<boolean> {
  try {
    await readFile(file, "utf8");
    return true;
  } catch {
    return false;
  }
}

function normalizeEntry(
  entry: Record<string, unknown>,
  type: EntryType,
): StoredFinancialEntry {
  const legacyMonth = typeof entry["month"] === "string" ? entry["month"] : "";
  return {
    id: typeof entry["id"] === "string" ? entry["id"] : crypto.randomUUID(),
    type,
    name: String(entry["name"] ?? ""),
    amount: Number(entry["amount"]),
    description: String(entry["description"] ?? ""),
    currency: String(entry["currency"] ?? "EUR"),
    date:
      typeof entry["date"] === "string"
        ? entry["date"]
        : `${legacyMonth || new Date().toISOString().slice(0, 7)}-01`,
    createdAt:
      typeof entry["createdAt"] === "string"
        ? entry["createdAt"]
        : new Date().toISOString(),
  };
}

function openingBalanceToRow(amount: number): CsvRow {
  return {
    recordType: "openingBalance",
    id: "opening-balance",
    companyName: "",
    positionDescription: "",
    currency: "",
    amount: String(amount),
    monthlySalary: "",
    extraPayAmount: "",
    startDate: "",
    endDate: "",
    createdAt: "",
  };
}

function salaryPeriodToRow(period: SalaryPeriod): CsvRow {
  return {
    recordType: "salary",
    id: period.id,
    companyName: period.companyName,
    positionDescription: period.positionDescription,
    currency: period.currency,
    amount: "",
    monthlySalary: String(period.monthlySalary),
    extraPayAmount: String(period.extraPayAmount),
    startDate: period.startDate,
    endDate: period.endDate,
    createdAt: period.createdAt,
  };
}

function rowToSalaryPeriod(row: CsvRow): SalaryPeriod {
  return {
    id: row["id"] || crypto.randomUUID(),
    companyName: row["companyName"] || "",
    positionDescription: row["positionDescription"] || "",
    currency: row["currency"] || "EUR",
    monthlySalary: Number(row["monthlySalary"]),
    extraPayAmount: Number(row["extraPayAmount"]),
    startDate: row["startDate"],
    endDate: row["endDate"],
    createdAt: row["createdAt"] || new Date().toISOString(),
  };
}

function salaryDataToRows(data: SalaryData): CsvRow[] {
  return [
    openingBalanceToRow(data.openingBalance),
    ...data.periods.map(salaryPeriodToRow),
  ];
}

function entryToRow(entry: StoredFinancialEntry): CsvRow {
  return {
    id: entry.id,
    name: entry.name,
    amount: String(entry.amount),
    description: entry.description,
    currency: entry.currency,
    date: entry.date,
    createdAt: entry.createdAt,
  };
}

function rowToEntry(row: CsvRow, type: EntryType): StoredFinancialEntry {
  return normalizeEntry(
    {
      id: row["id"],
      name: row["name"],
      amount: Number(row["amount"]),
      description: row["description"],
      currency: row["currency"],
      date: row["date"],
      month: row["month"],
      createdAt: row["createdAt"],
    },
    type,
  );
}

async function readLegacyData(): Promise<{
  salary: SalaryData;
  entries: StoredFinancialEntry[];
}> {
  try {
    const legacy = JSON.parse(
      await readFile(legacyFinanceFile, "utf8"),
    ) as LegacyFinanceStore;
    return {
      salary: legacy.salary
        ? {
            openingBalance: legacy.salary.openingBalance ?? 0,
            periods: [
              {
                id: crypto.randomUUID(),
                companyName: "",
                positionDescription: "",
                currency: "EUR",
                monthlySalary: legacy.salary.monthlySalary ?? 0,
                extraPayAmount: legacy.salary.extraPayAmount ?? 0,
                startDate: `${legacy.salary.startMonth ?? new Date().toISOString().slice(0, 7)}-01`,
                endDate: new Date().toISOString().slice(0, 10),
                createdAt: new Date().toISOString(),
              },
            ],
          }
        : { openingBalance: 0, periods: [] },
      entries: (legacy.entries ?? []).map((entry) => {
        return normalizeEntry(
          entry,
          entry["type"] === "income" ? "income" : "expense",
        );
      }),
    };
  } catch {
    try {
      const expenses = JSON.parse(
        await readFile(legacyExpensesFile, "utf8"),
      ) as LegacyExpense[];
      return {
        salary: { openingBalance: 0, periods: [] },
        entries: expenses
          .filter((expense) => {
            return expense.title && expense.amount && expense.date;
          })
          .map((expense) => {
            return normalizeEntry(
              {
                id: expense.id,
                name: expense.title!,
                amount: expense.amount!,
                date: expense.date!,
                createdAt: expense.createdAt,
              },
              "expense",
            );
          }),
      };
    } catch {
      // No legacy files exist in the root database directory.
    }
  }
  return { salary: { openingBalance: 0, periods: [] }, entries: [] };
}

async function writeEntries(
  type: EntryType,
  entries: StoredFinancialEntry[],
): Promise<void> {
  const file = type === "income" ? incomeFile : expenseFile;
  await writeFile(
    file,
    serializeCsv(entryHeaders, entries.map(entryToRow)),
    "utf8",
  );
}

async function ensureStore(): Promise<void> {
  await mkdir(databaseDirectory, { recursive: true });
  const [hasSalary, hasIncome, hasExpenses] = await Promise.all([
    fileExists(salaryFile),
    fileExists(incomeFile),
    fileExists(expenseFile),
  ]);
  if (hasSalary && hasIncome && hasExpenses) {
    await Promise.all([
      ensureSalarySchema(),
      ensureEntrySchema(incomeFile, "income"),
      ensureEntrySchema(expenseFile, "expense"),
    ]);
    return;
  }

  const legacy = await readLegacyData();
  if (!hasSalary) {
    await writeFile(
      salaryFile,
      serializeCsv(salaryHeaders, salaryDataToRows(legacy.salary)),
      "utf8",
    );
  } else {
    await ensureSalarySchema();
  }
  if (!hasIncome) {
    await writeEntries(
      "income",
      legacy.entries.filter((entry) => {
        return entry.type === "income";
      }),
    );
  }
  if (!hasExpenses) {
    await writeEntries(
      "expense",
      legacy.entries.filter((entry) => {
        return entry.type === "expense";
      }),
    );
  }
}

async function ensureSalarySchema(): Promise<void> {
  const contents = await readFile(salaryFile, "utf8");
  const header = contents.split(/\r?\n/, 1)[0];
  if (header === salaryHeaders.join(",")) return;

  const legacyRows = parseCsv(contents);
  const currentSalaryRows = legacyRows.filter((row) => {
    return row["recordType"] === "salary";
  });
  if (currentSalaryRows.length > 0) {
    const openingBalance = legacyRows.find((row) => {
      return row["recordType"] === "openingBalance";
    });
    const migrated: SalaryData = {
      openingBalance: Number(openingBalance?.["amount"] ?? 0),
      periods: currentSalaryRows.map((row) => {
        return {
          id: row["id"] || crypto.randomUUID(),
          companyName: row["companyName"] || "",
          positionDescription: row["positionDescription"] || "",
          currency: row["currency"] || "EUR",
          monthlySalary: Number(row["monthlySalary"] ?? 0),
          extraPayAmount: Number(row["extraPayAmount"] ?? 0),
          startDate: row["startDate"],
          endDate: row["endDate"],
          createdAt: row["createdAt"] || new Date().toISOString(),
        };
      }),
    };
    await writeFile(
      salaryFile,
      serializeCsv(salaryHeaders, salaryDataToRows(migrated)),
      "utf8",
    );
    return;
  }

  const [legacyRow] = legacyRows;
  const startMonth =
    legacyRow?.["startMonth"] || new Date().toISOString().slice(0, 7);
  const migrated: SalaryData = {
    openingBalance: Number(legacyRow?.["openingBalance"] ?? 0),
    periods: legacyRow
      ? [
          {
            id: crypto.randomUUID(),
            companyName: "",
            positionDescription: "",
            currency: "EUR",
            monthlySalary: Number(legacyRow["monthlySalary"] ?? 0),
            extraPayAmount: Number(legacyRow["extraPayAmount"] ?? 0),
            startDate: `${startMonth}-01`,
            endDate: new Date().toISOString().slice(0, 10),
            createdAt: new Date().toISOString(),
          },
        ]
      : [],
  };
  await writeFile(
    salaryFile,
    serializeCsv(salaryHeaders, salaryDataToRows(migrated)),
    "utf8",
  );
}

async function ensureEntrySchema(file: string, type: EntryType): Promise<void> {
  const contents = await readFile(file, "utf8");
  const header = contents.split(/\r?\n/, 1)[0];
  if (header === entryHeaders.join(",")) return;
  const entries = parseCsv(contents).map((row) => {
    return rowToEntry(row, type);
  });
  await writeFile(
    file,
    serializeCsv(entryHeaders, entries.map(entryToRow)),
    "utf8",
  );
}

async function readEntries(type: EntryType): Promise<StoredFinancialEntry[]> {
  await ensureStore();
  const file = type === "income" ? incomeFile : expenseFile;
  return parseCsv(await readFile(file, "utf8")).map((row) => {
    return rowToEntry(row, type);
  });
}

export async function getSalary(): Promise<SalaryData> {
  await ensureStore();
  const rows = parseCsv(await readFile(salaryFile, "utf8"));
  const openingBalance = rows.find((row) => {
    return row["recordType"] === "openingBalance";
  });
  return {
    openingBalance: Number(openingBalance?.["amount"] ?? 0),
    periods: rows
      .filter((row) => {
        return row["recordType"] === "salary";
      })
      .map(rowToSalaryPeriod)
      .sort((a, b) => {
        return a.startDate.localeCompare(b.startDate);
      }),
  };
}

export async function saveSalary(input: SalaryDataInput): Promise<SalaryData> {
  await ensureStore();
  const data: SalaryData = {
    openingBalance: input.openingBalance,
    periods: input.periods.map((period) => {
      return {
        ...period,
        id: period.id ?? crypto.randomUUID(),
        createdAt: period.createdAt ?? new Date().toISOString(),
      };
    }),
  };
  await writeFile(
    salaryFile,
    serializeCsv(salaryHeaders, salaryDataToRows(data)),
    "utf8",
  );
  return data;
}

export async function clearSalary(): Promise<void> {
  await ensureStore();
  await writeFile(
    salaryFile,
    serializeCsv(
      salaryHeaders,
      salaryDataToRows({ openingBalance: 0, periods: [] }),
    ),
    "utf8",
  );
}

export async function deleteSalaryPeriod(id: string): Promise<boolean> {
  const salary = await getSalary();
  const periods = salary.periods.filter((period) => {
    return period.id !== id;
  });
  if (periods.length === salary.periods.length) return false;

  await writeFile(
    salaryFile,
    serializeCsv(
      salaryHeaders,
      salaryDataToRows({ openingBalance: salary.openingBalance, periods }),
    ),
    "utf8",
  );
  return true;
}

export async function getEntries(): Promise<StoredFinancialEntry[]> {
  const entries = [
    ...(await readEntries("income")),
    ...(await readEntries("expense")),
  ];
  return entries.sort((a, b) => {
    return (
      b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
    );
  });
}

export async function createEntry(
  input: FinancialEntryInput,
): Promise<StoredFinancialEntry> {
  const entries = await readEntries(input.type);
  const entry: StoredFinancialEntry = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  entries.push(entry);
  await writeEntries(input.type, entries);
  return entry;
}

export async function updateEntry(
  id: string,
  input: FinancialEntryInput,
): Promise<StoredFinancialEntry | null> {
  const allEntries = await getEntries();
  const existing = allEntries.find((entry) => {
    return entry.id === id;
  });
  if (!existing) return null;

  const updated: StoredFinancialEntry = {
    ...existing,
    ...input,
  };
  const incomeEntries = allEntries.filter((entry) => {
    return entry.type === "income" && entry.id !== id;
  });
  const expenseEntries = allEntries.filter((entry) => {
    return entry.type === "expense" && entry.id !== id;
  });
  (updated.type === "income" ? incomeEntries : expenseEntries).push(updated);
  await Promise.all([
    writeEntries("income", incomeEntries),
    writeEntries("expense", expenseEntries),
  ]);
  return updated;
}

export async function deleteEntry(id: string): Promise<boolean> {
  const [incomeEntries, expenseEntries] = await Promise.all([
    readEntries("income"),
    readEntries("expense"),
  ]);
  const filteredIncome = incomeEntries.filter((entry) => {
    return entry.id !== id;
  });
  const filteredExpenses = expenseEntries.filter((entry) => {
    return entry.id !== id;
  });
  if (
    filteredIncome.length === incomeEntries.length &&
    filteredExpenses.length === expenseEntries.length
  ) {
    return false;
  }
  await Promise.all([
    writeEntries("income", filteredIncome),
    writeEntries("expense", filteredExpenses),
  ]);
  return true;
}
