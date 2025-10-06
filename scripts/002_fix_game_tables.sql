-- Drop the old table with the wrong foreign key reference
DROP TABLE IF EXISTS user_game_states;

-- Recreate user_game_states table without foreign key constraint
-- (since we're using simple_users table from a different script)
CREATE TABLE IF NOT EXISTS user_game_states (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  world_id INTEGER NOT NULL,
  game_data JSONB NOT NULL,
  last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, world_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_game_states_user_id ON user_game_states(user_id);
CREATE INDEX IF NOT EXISTS idx_user_game_states_world_id ON user_game_states(world_id);
CREATE INDEX IF NOT EXISTS idx_user_game_states_last_played ON user_game_states(last_played);

-- Insert a test user if it doesn't exist
INSERT INTO simple_users (id, username, password_hash)
VALUES (1, 'testuser', 'test')
ON CONFLICT (id) DO NOTHING;
