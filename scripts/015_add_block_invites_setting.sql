-- Add block_alliance_invites column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS block_alliance_invites BOOLEAN DEFAULT FALSE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_block_invites ON users(block_alliance_invites);
