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
