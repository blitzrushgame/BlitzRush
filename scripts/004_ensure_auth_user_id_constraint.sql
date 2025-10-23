-- Ensure auth_user_id has proper foreign key constraint to Supabase Auth
-- This links our users table to Supabase's auth.users table

-- First, make sure auth_user_id is NOT NULL for proper foreign key relationship
-- (We'll keep it nullable for now to allow migration, but new users must have it)

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_auth_user_id_fkey'
  ) THEN
    ALTER TABLE users 
    ADD CONSTRAINT users_auth_user_id_fkey 
    FOREIGN KEY (auth_user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Create index on auth_user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

-- Remove password column since Supabase Auth handles passwords
-- (Keeping it for now during migration, but it should be removed eventually)
-- ALTER TABLE users DROP COLUMN IF EXISTS password;
