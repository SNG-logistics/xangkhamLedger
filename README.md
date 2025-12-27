# XANGKHAM Ledger
Lottery accounting web app for Lao legal lottery operations. Built with Node.js, Express, EJS, and MySQL.

## Features
- Period management: create, lock/unlock, backfill mode, sequential lock checks.
- Income & expenses: dual currency (LAK/THB), attachments, audit trail.
- Bank & cashflow: bank balances, bank accounts, cashflow tracking.
- Reports: dashboard, monthly print view, audit log.
- Security: session auth, SUPER_ADMIN checks, RBAC on locked periods.

## Quick Start
1) Prerequisites: Node.js ≥16, MySQL.
2) Install deps: `npm install`.
3) Copy `.env.example` to `.env` and set DB credentials and `SESSION_SECRET`.
4) Create DB: `CREATE DATABASE changkhum_ledger CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
5) Import schema:
   - Full setup: `mysql -u root -p changkhum_ledger < sql/full_database_setup.sql`
   - Or base + migrations: `sql/001_schema.sql` → `002_seed_superadmin.sql` → `003_period_engine.sql` … `009_update_audit_log.sql`
   - Or run helpers: `node scripts/force_schema_update.js` then `node scripts/update_audit_schema.js`.
6) Seed SUPER_ADMIN: `node src/scripts/seed.js` (or import `sql/002_seed_superadmin.sql`).
7) Run dev server: `npm run dev` → open `http://localhost:3000` (login `admin` / `admin123`).

## Database Helpers
- Run incremental migrations (bank/backfill/incidents): `run_all_migrations.bat` or `node run_migrations_js.js`.
- Audit log schema fix: `node scripts/update_audit_schema.js`.

## Troubleshooting
- Missing columns/tables: rerun schema scripts above.
- Login fails: ensure admin seed is loaded and DB creds match `.env`.
- Period edits blocked: period is LOCKED; only SUPER_ADMIN can unlock.

## Structure
- App entry: `src/server.js`
- Routes/controllers/models: `src/routes`, `src/controllers`, `src/models`
- Views/static: `src/views`, `src/public`
- SQL: `sql/*.sql`

## License
MIT
