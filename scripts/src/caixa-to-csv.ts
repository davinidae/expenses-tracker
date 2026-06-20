import fs from "node:fs";
import crypto, { randomUUID } from "node:crypto";

type CliArgs = {
  source: string;
  destination: string;
  createdAt: string;
};

type OutputRow = {
  id: string;
  name: string;
  amount: string;
  description: string;
  currency: "EUR";
  date: string;
  createdAt: string;
};

function getCliArgs(): CliArgs {
  const args = process.argv.slice(2);
  const getValue = (name: string): string | undefined => {
    const index = args.indexOf(name);
    if (index === -1) {
      return undefined;
    }
    return args[index + 1];
  };
  const source = getValue("--source") ?? getValue("-s");
  const destination = getValue("--destination") ?? getValue("-d");
  const createdAt = getValue("--created-at") ?? new Date().toISOString();
  if (!source || !destination) {
    console.error(`
Usage:
  npm run transform:caixa -- --source input.csv --destination output.csv

Optional:
  npm run transform:caixa -- --source input.csv --destination output.csv --created-at 2026-06-20T00:00:00+02:00

Aliases:
  npm run transform:caixa -- -s input.csv -d output.csv
`);
    process.exit(1);
  }
  return {
    source,
    destination,
    createdAt,
  };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && insideQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function toIsoDate(spanishDate: string): string {
  const [day, month, year] = spanishDate.split("/");
  if (!day || !month || !year) {
    throw new Error(`Invalid date format: ${spanishDate}`);
  }
  return `${year}-${month}-${day}`;
}

function createId(row: string[], index: number): string {
  return randomUUID();
}

function normalizeAmount(value: string): string {
  const amount = Number(value);
  if (Number.isNaN(amount)) {
    throw new Error(`Invalid amount: ${value}`);
  }
  return Math.abs(amount).toFixed(2);
}

function transformBankCsv(input: string, createdAt: string): OutputRow[] {
  const lines = input
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => {
      return line.trim() !== "";
    });
  const headerIndex = lines.findIndex((line) => {
    return line.startsWith("Fecha,Fecha valor,Movimiento,Más datos,Importe");
  });
  if (headerIndex === -1) {
    throw new Error(
      "Could not find expected header: Fecha,Fecha valor,Movimiento,Más datos,Importe",
    );
  }
  const dataLines = lines.slice(headerIndex + 1);
  return dataLines.map((line, index) => {
    const row = parseCsvLine(line);
    const fecha = row[0];
    const movimiento = row[2];
    const masDatos = row[3] ?? "";
    const importe = row[4];
    if (!fecha || !movimiento || !importe) {
      throw new Error(`Invalid row: ${line}`);
    }
    return {
      id: createId(row, index + 1),
      name: movimiento,
      amount: normalizeAmount(importe),
      description: masDatos,
      currency: "EUR",
      date: toIsoDate(fecha),
      createdAt,
    };
  });
}

function toOutputCsv(rows: OutputRow[]): string {
  const header: Array<keyof OutputRow> = [
    "id",
    "name",
    "amount",
    "description",
    "currency",
    "date",
    "createdAt",
  ];
  const outputRows = [
    header,
    ...rows.map((row) => {
      return header.map((key) => {
        return row[key];
      });
    }),
  ];
  return outputRows
    .map((row) => {
      return row.map(escapeCsv).join(",");
    })
    .join("\n");
}

function main(): void {
  const { source, destination, createdAt } = getCliArgs();
  const input = fs.readFileSync(source, "utf8");
  const rows = transformBankCsv(input, createdAt);
  const output = toOutputCsv(rows);
  fs.writeFileSync(destination, output, "utf8");
  console.log(`Created ${destination} with ${rows.length} rows`);
}

main();
