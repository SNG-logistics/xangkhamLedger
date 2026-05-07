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
