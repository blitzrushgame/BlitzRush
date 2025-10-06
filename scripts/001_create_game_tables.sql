-- Create users table for simple authentication
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_game_states table for storing game progress
CREATE TABLE IF NOT EXISTS user_game_states (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  world_id INTEGER NOT NULL,
  game_data JSONB NOT NULL,
  last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, world_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_game_states_user_id ON user_game_states(user_id);
CREATE INDEX IF NOT EXISTS idx_user_game_states_world_id ON user_game_states(world_id);
CREATE INDEX IF NOT EXISTS idx_user_game_states_last_played ON user_game_states(last_played);
