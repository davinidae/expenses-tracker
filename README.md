# Pocket Ledger

A full-stack personal finance dashboard built entirely with TypeScript.

## Project structure

```text
expenses-dashboard/
├── frontend/              Angular application
│   ├── src/components/
│   │   ├── finance-column/ Unified salary/income/expense column
│   │   ├── entry-card/     Read-only financial entry
│   │   ├── finance-chart/  Chart.js history graph
│   │   └── *-dialog/       Dynamic PrimeNG dialog content
│   ├── src/screens/        Dashboard screen and orchestration
│   ├── src/layers/         Global overlays and notifications
│   ├── src/services/       Application and API services
│   ├── src/app/            Minimal app shell
│   └── src/models/        Frontend TypeScript models
├── backend/               Express API
│   ├── src/models/        Backend TypeScript models
│   ├── src/endpoints/     Express API endpoint routers
│   ├── src/services/      Currency enrichment and timeline logic
│   ├── src/schemas/       API request validation
│   ├── src/index.ts       Express bootstrap and middleware
│   └── src/store.ts       CSV persistence
├── database/              Backend-owned CSV files
└── package.json           Convenience commands for both apps
```

The applications have separate dependencies and configuration, so each folder can be understood, developed, or deployed independently.

The frontend uses PrimeNG components and Chart.js. Non-EUR one-off entries are
converted once through Frankfurter when saved, and that fixed EUR value is used
for totals and historical charts.

## Install

```bash
npm install
npm run install:all
```

## Development

Run both applications:

```bash
npm start
```

Open `http://localhost:3000`. The API runs at `http://localhost:4000`.

Run either application independently:

```bash
npm run start --prefix frontend
npm run dev --prefix backend
```

Financial data uses three independent CSV databases:

- `database/salary.csv`
- `database/income.csv`
- `database/expenses.csv`

The salary CSV contains one separate opening-balance row and any number of
salary-period rows. Each period stores monthly salary, extra pay, start date,
end date, company name, position description, and currency. Overlapping periods
are converted to EUR in real time and summed for the selected month and chart.
Income and expense rows contain the entered name,
amount, description, currency, and full transaction date. Exchange rates and
EUR amounts are never stored in CSV. The backend recalculates EUR values from
live rates using `currency.js` whenever entries or chart data are requested.
Optional legacy imports must also be placed inside the root `database/`
directory.

Only the backend accesses the `database/` directory. The Angular frontend reads
and changes data exclusively through `/api` HTTP requests. A custom database
location may be supplied to the backend with the `DATABASE_DIR` environment
variable.

The backend never reads from or writes to a `backend/data` directory.

## Dashboard model

- Salary periods apply to every calendar month overlapped by their start and end
  dates.
- Each active period contributes its extra-pay amount in June and December.
- Opening balance is applied once and is not monthly income.
- Income and expense entries are independent monthly collections.
- One-off entries keep their original currency and an exact day/month/year date.
- EUR values are calculated at request time and monthly grouping is used only
  for filters and chart aggregation.
- The interactive chart shows complete history and can switch between monthly
  savings and cumulative balance.

## Production

```bash
npm run build
npm run serve
```

Open `http://localhost:4000`. The backend serves the compiled Angular application.
