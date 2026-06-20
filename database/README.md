# CSV database

This directory is owned by the backend application.

At runtime the backend creates and maintains three independent files:

- `salary.csv`
- `income.csv`
- `expenses.csv`

Income and expense rows store only source data: name, amount, description,
currency, exact transaction date, and internal identifiers. Exchange rates and
EUR amounts are calculated by the backend at request time and are never stored
in these files.

The Angular frontend must never read these files directly. It accesses financial
data exclusively through the backend HTTP API.
