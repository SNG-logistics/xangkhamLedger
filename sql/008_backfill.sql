-- FILE: sql/008_backfill.sql

CREATE TABLE system_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value VARCHAR(255),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE periods ADD COLUMN is_backfill BOOLEAN DEFAULT FALSE;

INSERT INTO system_settings (setting_key, setting_value) VALUES ('BACKFILL_MODE', 'OFF');
