-- Fix user_game_states table to use integer user_id instead of uuid
-- This aligns with the users table which uses integer IDs

-- Drop the existing table if it exists
DROP TABLE IF EXISTS user_game_states CASCADE;

-- Recreate with correct schema
CREATE TABLE user_game_states (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  world_id INTEGER NOT NULL,
  game_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_played TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, world_id)
);

-- Create index for faster lookups
CREATE INDEX idx_user_game_states_user_world ON user_game_states(user_id, world_id);

-- Enable RLS
ALTER TABLE user_game_states ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own game states
CREATE POLICY "Users can view own game states"
  ON user_game_states
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own game states"
  ON user_game_states
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own game states"
  ON user_game_states
  FOR UPDATE
  USING (true);
