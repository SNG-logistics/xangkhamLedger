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
