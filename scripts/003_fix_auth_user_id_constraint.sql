-- Remove the foreign key constraint on auth_user_id
-- This allows us to use a simple username/password system without Supabase Auth

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_user_id_fkey;

-- Make auth_user_id nullable since we're not using Supabase Auth
ALTER TABLE users ALTER COLUMN auth_user_id DROP NOT NULL;

-- Add a unique constraint on username to prevent duplicates
ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);
