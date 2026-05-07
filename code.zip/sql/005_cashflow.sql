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
