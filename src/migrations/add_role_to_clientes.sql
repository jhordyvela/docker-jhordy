-- Add a role column to usuarios with default 'cliente'
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'cliente';

-- Ensure existing rows have a role value
UPDATE usuarios
SET role = 'cliente'
WHERE role IS NULL;

-- You can update a specific user to admin manually, for example:
-- UPDATE usuarios SET role = 'administrador' WHERE email = 'admin@gmail.com';
