import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as XLSX from "xlsx";

type CliArgs = {
  source: string;
  destination: string;
  createdAt: string;
};

type Direction = "income" | "expense";

type OutputRow = {
  id: string;
  name: string;
  amount: string;
  description: string;
  currency: string;
  date: string;
  createdAt: string;
};

type RawRow = Array<string | number | boolean | Date | null | undefined>;

const conceptLabels: Record<string, string> = {
  "12/040": "Compra con tarjeta",
  "02/040": "Devolución/recuperación tarjeta",
  "11/040": "Retirada de cajero",
  "17/036": "Comisión cajero",
  "17/016": "Tributo/recibo público",
  "03/033": "Recibo",
  "03/035": "Recibo entidad de financiación",
  "03/038": "Recibo",
  "03/046": "Recibo telecomunicaciones",
  "03/005": "Recibo de suministros",
  "04/002": "Bizum/traspaso",
  "04/073": "Pago traspasos/transferencias",
  "04/067": "Transferencia",
  "02/002": "Ingreso/transferencia",
  "02/041": "Transferencia/Nómina",
  "02/032": "Devolución recibo",
  "02/036": "Regularización comisión",
  "02/067": "Ingreso/devolución",
  "98/040": "Anulación operación tarjeta",
  "98/036": "Anulación comisión",
  "17/040": "Pago P2P",
};

const selfPatterns = [
  "DAVID PERERA MORENO",
  "PERERA MORENO DAVID",
  "PERERA MORENO,DAVID",
  "DAVID;PERERA;MORENO",
];

const codePrefixRegex = /^[0-9A-Z]{3,}[0-9A-Z*\-]*\s{2,}/;
const multiSpaceRegex = /\s+/g;

function getCliArgs(): CliArgs {
  const args = process.argv.slice(2);

  const getValue = (name: string): string | undefined => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };

  const source = getValue("--source") ?? getValue("-s");
  const destination = getValue("--destination") ?? getValue("-d");
  const createdAt = getValue("--created-at") ?? new Date().toISOString();

  if (!source || !destination) {
    console.error(`
Usage:
  npm run transform:caixa:excel -- --source TT210626.258.XLS --destination ./output

Optional:
  npm run transform:caixa:excel -- --source TT210626.258.XLS --destination ./output --created-at 2026-06-21T00:00:00+02:00
`);
    process.exit(1);
  }

  return { source, destination, createdAt };
}

function cleanText(value: unknown): string {
  if (value === null || value === undefined) return "";

  let text = String(value)
    .replace(/\u00a0/g, " ")
    .replace(/;/g, " ")
    .replace(/NOTPROVIDE/g, " ")
    .trim();

  if (text.startsWith("CORE")) {
    text = text.slice(4).trim();
  }

  text = text.replace(codePrefixRegex, "").trim();
  text = text.replace(multiSpaceRegex, " ");

  return text;
}

function normalizeForCompare(text: string): string {
  return text
    .toUpperCase()
    .replace(/;/g, " ")
    .replace(multiSpaceRegex, " ")
    .trim();
}

function isSelfOrAccountish(text: string): boolean {
  const normalized = normalizeForCompare(text);

  if (!normalized) {
    return false;
  }
  if (
    selfPatterns.some((pattern) => {
      return normalized.includes(pattern);
    })
  ) {
    return true;
  }

  return /^\d{4}\s+\d{2}\s+\d{7,}/.test(normalized);
}

function toIsoDate(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) throw new Error(`Invalid Excel date serial: ${value}`);
    return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }

  const text = cleanText(value);
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  throw new Error(`Invalid date: ${String(value)}`);
}

function normalizeAmount(value: unknown, direction: Direction): string {
  const raw = typeof value === "string" ? value.replace(",", ".") : value;
  const parsed = Number(raw);

  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid amount: ${String(value)}`);
  }

  const signedAmount =
    direction === "expense" ? -Math.abs(parsed) : Math.abs(parsed);

  return signedAmount.toFixed(2);
}

function createId(
  rowIndex: number,
  direction: Direction,
  fields: unknown[],
): string {
  const raw = `${rowIndex}|${direction}|${fields
    .map((field) => {
      return String(field ?? "");
    })
    .join("|")}`;
  return `txn_${crypto.createHash("sha1").update(raw).digest("hex").slice(0, 12)}`;
}

function dedupeParts(parts: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const part of parts) {
    const cleaned = cleanText(part);
    if (!cleaned) continue;

    const normalized = normalizeForCompare(cleaned);
    if (seen.has(normalized)) continue;

    seen.add(normalized);
    output.push(cleaned);
  }

  return output;
}

function bestName(common: string, own: string, comps: string[]): string {
  const pair = `${common}/${own}`;
  const comp1 = comps[0] ?? "";
  const comp5 = comps[4] ?? "";
  const comp9 = comps[8] ?? "";

  if (["04/002", "04/073", "04/067"].includes(pair) && comp5) {
    return comp5;
  }

  if (
    ["02/002", "02/067"].includes(pair) &&
    comp5 &&
    !comp5.toLowerCase().startsWith("transferencia de")
  ) {
    return comp5;
  }

  return comp1 || comp5 || comp9 || conceptLabels[pair] || `Concepto ${pair}`;
}

function buildDescription(
  common: string,
  own: string,
  name: string,
  comps: string[],
  dateValue: unknown,
): string {
  const pair = `${common}/${own}`;
  const parts: string[] = [];
  const label = conceptLabels[pair];

  if (label) parts.push(label);

  for (const value of comps) {
    const cleaned = cleanText(value);
    if (!cleaned) continue;
    if (normalizeForCompare(cleaned) === normalizeForCompare(name)) continue;
    if (isSelfOrAccountish(cleaned) && parts.length > 0) continue;

    parts.push(cleaned);
  }

  if (dateValue) {
    parts.push(`Fecha valor: ${toIsoDate(dateValue)}`);
  }

  return dedupeParts(parts).join(" | ");
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";

  const text = String(value);

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function toCsv(rows: OutputRow[]): string {
  const headers: Array<keyof OutputRow> = [
    "id",
    "name",
    "amount",
    "description",
    "currency",
    "date",
    "createdAt",
  ];
  const lines = [headers.join(",")];

  for (const row of rows) {
    lines.push(
      headers
        .map((key) => {
          return escapeCsv(row[key]);
        })
        .join(","),
    );
  }

  return `${lines.join("\n")}\n`;
}

function findHeaderRow(rows: RawRow[]): number {
  const index = rows.findIndex((row) => {
    return row.map(cleanText).includes("F. Operación");
  });

  if (index === -1) {
    throw new Error(
      'Could not find Excel header row containing "F. Operación"',
    );
  }

  return index;
}

function getIndex(headers: string[], name: string): number {
  const index = headers.indexOf(name);

  if (index === -1) {
    throw new Error(`Missing column: ${name}`);
  }

  return index;
}

function transform(
  source: string,
  createdAt: string,
): { expenses: OutputRow[]; incomes: OutputRow[] } {
  const workbook = XLSX.readFile(source, { cellDates: false, raw: true });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("Workbook has no sheets");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true,
  }) as RawRow[];
  const headerRowIndex = findHeaderRow(rows);
  const headers = rows[headerRowIndex].map(cleanText);
  const dataRows = rows.slice(headerRowIndex + 1);

  const currencyIndex = getIndex(headers, "Divisa");
  const dateOpIndex = getIndex(headers, "F. Operación");
  const dateValueIndex = getIndex(headers, "F. Valor");
  const incomeIndex = getIndex(headers, "Ingreso (+)");
  const expenseIndex = getIndex(headers, "Gasto (-)");
  const commonIndex = getIndex(headers, "Concepto común");
  const ownIndex = getIndex(headers, "Concepto propio");
  const compIndexes = Array.from({ length: 10 }, (_, index) =>
    getIndex(headers, `Concepto complementario ${index + 1}`),
  );

  const expenses: OutputRow[] = [];
  const incomes: OutputRow[] = [];

  dataRows.forEach((row, offset) => {
    const dateOp = row[dateOpIndex];
    const incomeValue = row[incomeIndex];
    const expenseValue = row[expenseIndex];

    if (dateOp === null && incomeValue === null && expenseValue === null)
      return;
    if (incomeValue === null && expenseValue === null) return;

    const direction: Direction =
      incomeValue !== null && incomeValue !== undefined ? "income" : "expense";
    const value = direction === "income" ? incomeValue : expenseValue;
    const currency = cleanText(row[currencyIndex]) || "EUR";
    const common = cleanText(row[commonIndex]);
    const own = cleanText(row[ownIndex]);
    const comps = compIndexes.map((index) => {
      return cleanText(row[index]);
    });
    const name = bestName(common, own, comps);

    const outputRow: OutputRow = {
      id: createId(headerRowIndex + 1 + offset, direction, [
        dateOp,
        value,
        currency,
        common,
        own,
        ...comps,
      ]),
      name,
      amount: normalizeAmount(value, direction),
      description: buildDescription(
        common,
        own,
        name,
        comps,
        row[dateValueIndex],
      ),
      currency,
      date: toIsoDate(dateOp),
      createdAt,
    };

    if (direction === "income") incomes.push(outputRow);
    else expenses.push(outputRow);
  });

  return { expenses, incomes };
}

function main(): void {
  const { source, destination, createdAt } = getCliArgs();
  const { expenses, incomes } = transform(source, createdAt);

  fs.mkdirSync(destination, { recursive: true });

  const expensesPath = path.join(destination, "caixa_gastos.csv");
  const incomesPath = path.join(destination, "caixa_ingresos.csv");

  fs.writeFileSync(expensesPath, toCsv(expenses), "utf8");
  fs.writeFileSync(incomesPath, toCsv(incomes), "utf8");

  console.log(`Created ${expensesPath} with ${expenses.length} rows`);
  console.log(`Created ${incomesPath} with ${incomes.length} rows`);
}

main();
