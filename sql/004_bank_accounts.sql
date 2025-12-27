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
