-- Seed: Admin user
-- Password: Admin@123 (bcrypt hash, 10 rounds)
INSERT INTO users (name, email, password_hash, role) VALUES
  ('Admin', 'admin@furnitureshop.vn', '$2b$10$YourHashHere', 'admin');
-- IMPORTANT: Replace the hash above by running:
-- node -e "const b=require('bcrypt');b.hash('Admin@123',10).then(h=>console.log(h))"
-- Then update this file and re-run, or use the backend seed script.
