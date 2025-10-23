-- Remove the foreign key constraint that's causing issues with user profile creation
-- We'll keep auth_user_id as a regular uuid field for reference, but without the constraint
-- This allows us to create user profiles immediately after Supabase Auth user creation

-- Drop the foreign key constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_user_id_fkey;

-- Keep the index for performance
-- (The index from script 004 will remain)

-- Ensure auth_user_id is nullable to allow flexibility
ALTER TABLE users ALTER COLUMN auth_user_id DROP NOT NULL;
