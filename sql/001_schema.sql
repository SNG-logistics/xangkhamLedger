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
