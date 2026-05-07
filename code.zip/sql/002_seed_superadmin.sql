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
