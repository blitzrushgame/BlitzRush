-- Remove password column from users table since Supabase Auth handles authentication
-- The password field is no longer needed as Supabase Auth stores hashed passwords securely

ALTER TABLE users DROP COLUMN IF EXISTS password;

-- Add comment to auth_user_id to clarify its purpose
COMMENT ON COLUMN users.auth_user_id IS 'Links to Supabase Auth user (auth.users table)';
