# Quick Start (Clean UTF-8)

This is a short, readable setup guide to replace the previously garbled encoding.

## 1) Install dependencies
```bash
npm install
```

## 2) Configure environment
Copy `.env.example` to `.env` and set:
```
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=changkhum_ledger
SESSION_SECRET=changkhum-secret-key-change-me
```

## 3) Prepare database
```sql
CREATE DATABASE changkhum_ledger CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Import schema (choose one):
- Full: `mysql -u root -p changkhum_ledger < sql/full_database_setup.sql`
- Base + migrations: run `sql/001_schema.sql` .. `sql/009_update_audit_log.sql` in order.
- Helper scripts: `node scripts/force_schema_update.js` then `node scripts/update_audit_schema.js`.

Seed SUPER_ADMIN:
```bash
node src/scripts/seed.js   # admin / admin123
```

## 4) Run server
```bash
npm run dev
```
Open http://localhost:3000 and login with `admin` / `admin123`.

## Notes
- If reports/bank/backfill/incident tables are missing, run `run_all_migrations.bat` or `node run_migrations_js.js`.
- If period edits are blocked, the period is LOCKED; only SUPER_ADMIN can unlock.
- If audit log errors mention `old_value`, rerun `node scripts/update_audit_schema.js`.
