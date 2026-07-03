-- SQL script to create the first admin user
-- Run this directly in your PostgreSQL database (e.g., via Supabase SQL Editor)

-- First, check if admin already exists
SELECT * FROM usuarios WHERE role = 'ADMIN';

-- If no admin exists, insert one with a hashed password
-- Password: admin123 (hashed with bcrypt, cost 10)
INSERT INTO usuarios (id, email, nome, senha, role, "createdAt", "updatedAt")
VALUES (
  'admin-user-id-placeholder',
  'admin@barbearia.com',
  'Administrador',
  '$2a$10$YourHashedPasswordHere',
  'ADMIN',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Note: You need to generate a proper bcrypt hash for the password
-- You can use an online bcrypt generator or run this Node.js script:
-- const bcrypt = require('bcryptjs');
-- console.log(bcrypt.hashSync('admin123', 10));
