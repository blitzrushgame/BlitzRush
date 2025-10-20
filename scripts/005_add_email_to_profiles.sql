-- Rewritten to work with the users table instead of profiles
-- Add email column to users table for future email-based features

-- Add email column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
