-- XANGKHAM Ledger - Full Database Setup Script
-- Generated at: 2025-12-27T10:20:52.690Z

-- START OF 001_schema.sql --
-- FILE: sql/001_schema.sql
-- Changkhum Ledger Database Schema

-- Drop tables if exists (for clean install)
DROP TABLE IF EXISTS journal_lines;
DROP TABLE IF EXISTS journal_entries;
DROP TABLE IF EXISTS bank_balances;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS sales_summaries;
DROP TABLE IF EXISTS period_lock_events;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS periods;
DROP TABLE IF EXISTS users;

-- Users table
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role ENUM('SUPER_ADMIN') DEFAULT 'SUPER_ADMIN',
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Periods table (งวดหวย)
CREATE TABLE periods (
  id INT PRIMARY KEY AUTO_INCREMENT,
  period_date DATE NOT NULL UNIQUE COMMENT 'วันที่งวด (YYYY-MM-DD)',
  period_year INT NOT NULL,
  period_month INT NOT NULL,
  draw_time TIME DEFAULT '20:00:00' COMMENT 'เวลาออกหวย',
  status ENUM('OPEN', 'LOCKED') DEFAULT 'OPEN',
  locked_at DATETIME NULL,
  locked_by INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_period_date (period_date),
  INDEX idx_status (status),
  INDEX idx_year_month (period_year, period_month),
  FOREIGN KEY (locked_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sales Summaries table (ยอดขาย)
CREATE TABLE sales_summaries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  period_id INT NOT NULL,
  sales_lak DECIMAL(15,2) DEFAULT 0 COMMENT 'ยอดขาย LAK',
  sales_thb DECIMAL(15,2) DEFAULT 0 COMMENT 'ยอดขาย THB',
  attached_files TEXT COMMENT 'JSON array of file paths',
  notes TEXT,
  created_by INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_period (period_id),
  FOREIGN KEY (period_id) REFERENCES periods(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Expenses table (ค่าใช้จ่าย)
CREATE TABLE expenses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  occurred_at DATETIME NOT NULL COMMENT 'เวลาเกิดจริง',
  accounting_period_id INT NOT NULL COMMENT 'งวดที่ถูกนำไปนับ (auto)',
  category VARCHAR(100) NOT NULL COMMENT 'ประเภทค่าใช้จ่าย',
  description TEXT,
  amount_lak DECIMAL(15,2) DEFAULT 0,
  amount_thb DECIMAL(15,2) DEFAULT 0,
  attached_files TEXT COMMENT 'JSON array of file paths',
  is_deleted BOOLEAN DEFAULT FALSE COMMENT 'Soft delete',
  created_by INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_accounting_period (accounting_period_id),
  INDEX idx_occurred_at (occurred_at),
  INDEX idx_deleted (is_deleted),
  FOREIGN KEY (accounting_period_id) REFERENCES periods(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bank Balances table (ยอดเงินธนาคาร)
CREATE TABLE bank_balances (
  id INT PRIMARY KEY AUTO_INCREMENT,
  period_id INT NOT NULL,
  bank_name ENUM('BCEL', 'LDB', 'JDB', 'OTHER') NOT NULL,
  bank_account VARCHAR(50),
  balance_lak DECIMAL(15,2) DEFAULT 0,
  balance_thb DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  created_by INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_period_bank (period_id, bank_name),
  FOREIGN KEY (period_id) REFERENCES periods(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Journal Entries table (รายการบัญชี - header)
CREATE TABLE journal_entries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  period_id INT NOT NULL,
  entry_date DATE NOT NULL,
  entry_type VARCHAR(50) DEFAULT 'AUTO_GL' COMMENT 'ประเภทรายการ',
  description TEXT,
  created_by INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_period (period_id),
  INDEX idx_entry_date (entry_date),
  FOREIGN KEY (period_id) REFERENCES periods(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Journal Lines table (รายการบัญชี - รายละเอียด)
CREATE TABLE journal_lines (
  id INT PRIMARY KEY AUTO_INCREMENT,
  journal_entry_id INT NOT NULL,
  account_code VARCHAR(20) NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  debit_lak DECIMAL(15,2) DEFAULT 0,
  credit_lak DECIMAL(15,2) DEFAULT 0,
  debit_thb DECIMAL(15,2) DEFAULT 0,
  credit_thb DECIMAL(15,2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_journal_entry (journal_entry_id),
  INDEX idx_account (account_code),
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit Log table (append-only)
CREATE TABLE audit_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  action VARCHAR(100) NOT NULL COMMENT 'Action type (e.g., LOCK_PERIOD, UNLOCK_PERIOD)',
  table_name VARCHAR(50),
  record_id INT,
  before_json TEXT COMMENT 'JSON snapshot before',
  after_json TEXT COMMENT 'JSON snapshot after',
  reason TEXT COMMENT 'เหตุผล (บังคับสำหรับ action เสี่ยง)',
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Period Lock Events table (เฉพาะ Lock/Unlock)
CREATE TABLE period_lock_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  period_id INT NOT NULL,
  action ENUM('LOCK', 'UNLOCK') NOT NULL,
  performed_by INT NOT NULL,
  reason TEXT NOT NULL,
  before_status VARCHAR(20),
  after_status VARCHAR(20),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_period (period_id),
  INDEX idx_action (action),
  FOREIGN KEY (period_id) REFERENCES periods(id),
  FOREIGN KEY (performed_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- END OF 001_schema.sql --

-- START OF 002_seed_superadmin.sql --
-- FILE: sql/002_seed_superadmin.sql
-- Seed SUPER_ADMIN user
-- Username: admin
-- Password: admin123

INSERT INTO users (username, password_hash, full_name, role, is_active)
VALUES (
  'admin',
  '$2b$10$rKh5vF0mCxO7YJ3n9K3z0ecX3h1PqJ8yF3v7mCrJ9K3z0ecX3h1Pq',
  'Super Administrator',
  'SUPER_ADMIN',
  TRUE
);

-- Insert sample periods for testing (current month)
INSERT INTO periods (period_date, period_year, period_month, status)
VALUES 
  ('2025-12-15', 2025, 12, 'LOCKED'),
  ('2025-12-18', 2025, 12, 'LOCKED'),
  ('2025-12-21', 2025, 12, 'OPEN'),
  ('2025-12-25', 2025, 12, 'OPEN');

-- END OF 002_seed_superadmin.sql --

-- START OF 003_period_engine.sql --
-- FILE: sql/003_period_engine.sql

-- Ensure period_lock_events table exists
CREATE TABLE IF NOT EXISTS period_lock_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  period_id INT NOT NULL,
  action ENUM('LOCK', 'UNLOCK') NOT NULL,
  performed_by INT NOT NULL,
  reason TEXT NOT NULL,
  before_status VARCHAR(20),
  after_status VARCHAR(20),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_period (period_id),
  INDEX idx_action (action),
  FOREIGN KEY (period_id) REFERENCES periods(id),
  FOREIGN KEY (performed_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add columns to periods if they don't exist (Idempotent check is hard in pure SQL without procedures, assuming simple ADD here for now or manual check)
-- In a real migration system we'd check existence. For this, I'll rely on the fact that if it fails it might exist, or use a procedure.
-- Simplified for this context:
-- ALTER TABLE periods ADD COLUMN locked_at DATETIME NULL;
-- ALTER TABLE periods ADD COLUMN locked_by INT NULL;
-- ALTER TABLE periods ADD FOREIGN KEY (locked_by) REFERENCES users(id);

-- END OF 003_period_engine.sql --

-- START OF 004_bank_accounts.sql --
-- FILE: sql/004_bank_accounts.sql

CREATE TABLE IF NOT EXISTS bank_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bank_name VARCHAR(50) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_name VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'LAK',
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO bank_accounts (bank_name, account_number, account_name) VALUES 
('BCEL', '000-000-000', 'Main Account'),
('LDB', '000-000-000', 'Tax Account'),
('JDB', '000-000-000', 'Broker Account');

-- END OF 004_bank_accounts.sql --

-- START OF 005_cashflow.sql --
-- FILE: sql/005_cashflow.sql

CREATE TABLE IF NOT EXISTS cashflow_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  transaction_date DATE NOT NULL,
  period_id INT NOT NULL,
  type ENUM('INFLOW', 'OUTFLOW', 'TRANSFER') NOT NULL,
  category ENUM(
    'SALES_IN',
    'PRIZE_PAYOUT',
    'OPEX',
    'TAX_TRANSFER',
    'TAX_PAY',
    'BROKER_TRANSFER',
    'BROKER_PAY',
    'TOP_UP_IN',
    'SETTLEMENT_CLEAR',
    'DIVIDEND_PAY',
    'OTHER'
  ) NOT NULL,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  bank_account_id INT NULL COMMENT 'From Account (or related account for Inflow/Outflow)',
  to_bank_account_id INT NULL COMMENT 'To Account (Only for Transfer)',
  description TEXT,
  created_by INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (period_id) REFERENCES periods(id),
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
  FOREIGN KEY (to_bank_account_id) REFERENCES bank_accounts(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  
  INDEX idx_period (period_id),
  INDEX idx_date (transaction_date),
  INDEX idx_type (type),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- END OF 005_cashflow.sql --

-- START OF 006_update_bank_balances.sql --
-- FILE: sql/006_update_bank_balances.sql

-- Drop old table
DROP TABLE IF EXISTS bank_balances;

-- Create new relational table
CREATE TABLE bank_balances (
  id INT PRIMARY KEY AUTO_INCREMENT,
  period_id INT NOT NULL,
  bank_account_id INT NOT NULL,
  balance_lak DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  updated_by INT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE,
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
  FOREIGN KEY (updated_by) REFERENCES users(id),
  
  UNIQUE KEY unique_period_account (period_id, bank_account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- END OF 006_update_bank_balances.sql --

-- START OF 007_incidents.sql --
-- FILE: sql/007_incidents.sql

CREATE TABLE incidents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  period_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity ENUM('LOW', 'MED', 'HIGH', 'CRITICAL') DEFAULT 'LOW',
  status ENUM('OPEN', 'RESOLVED') DEFAULT 'OPEN',
  resolution_note TEXT,
  created_by INT NOT NULL,
  resolved_by INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  
  FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (resolved_by) REFERENCES users(id),
  
  INDEX idx_period_status (period_id, status),
  INDEX idx_severity (severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- END OF 007_incidents.sql --

-- START OF 008_backfill.sql --
-- FILE: sql/008_backfill.sql

CREATE TABLE system_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value VARCHAR(255),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE periods ADD COLUMN is_backfill BOOLEAN DEFAULT FALSE;

INSERT INTO system_settings (setting_key, setting_value) VALUES ('BACKFILL_MODE', 'OFF');

-- END OF 008_backfill.sql --

-- START OF 009_update_audit_log.sql --
ALTER TABLE audit_log ADD COLUMN old_value JSON DEFAULT NULL;
ALTER TABLE audit_log ADD COLUMN new_value JSON DEFAULT NULL;

-- END OF 009_update_audit_log.sql --

