@echo off
echo Running Migrations...

echo [1/3] Updating Bank Balances Schema...
mysql -u root -p changkhum_ledger < sql/006_update_bank_balances.sql

echo [2/3] Creating Incidents Table...
mysql -u root -p changkhum_ledger < sql/007_incidents.sql

echo [3/3] Enabling Backfill Mode...
mysql -u root -p changkhum_ledger < sql/008_backfill.sql

echo.
echo All Migrations Completed!
pause
