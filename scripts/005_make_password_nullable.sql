-- Make password column nullable since we're using Supabase Auth
-- Passwords are stored securely in auth.users, not in public.users
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

-- Optional: Set existing passwords to NULL if any exist
UPDATE users SET password = NULL WHERE password IS NOT NULL;
