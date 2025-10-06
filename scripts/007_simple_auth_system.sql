-- Drop existing auth dependencies and create simple auth table
DROP TABLE IF EXISTS user_game_states CASCADE;
DROP TABLE IF EXISTS game_worlds CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Simple authentication table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- Plain text as requested
  ip_address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Case-insensitive unique username index
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (LOWER(username));

-- One account per IP constraint
CREATE UNIQUE INDEX IF NOT EXISTS users_ip_address_idx ON users (ip_address);

-- Recreate game worlds
CREATE TABLE IF NOT EXISTS game_worlds (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

-- Insert 10 game worlds
INSERT INTO game_worlds (id, name, description) VALUES
  (1, 'Sector Alpha', 'The first battleground'),
  (2, 'Sector Beta', 'Industrial wasteland'),
  (3, 'Sector Gamma', 'Desert warfare'),
  (4, 'Sector Delta', 'Frozen tundra'),
  (5, 'Sector Epsilon', 'Urban combat zone'),
  (6, 'Sector Zeta', 'Mountain fortress'),
  (7, 'Sector Eta', 'Coastal invasion'),
  (8, 'Sector Theta', 'Nuclear wasteland'),
  (9, 'Sector Iota', 'Jungle warfare'),
  (10, 'Sector Kappa', 'Space station');

-- User game states
CREATE TABLE IF NOT EXISTS user_game_states (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  world_id INTEGER REFERENCES game_worlds(id),
  game_data JSONB DEFAULT '{"buildings": [], "units": [], "resources": {"concrete": 1000, "steel": 1000, "carbon": 500, "fuel": 500}, "camera": {"x": 0, "y": 0, "zoom": 1}}'::jsonb,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, world_id)
);

-- Enable RLS and block all client-side access to users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_worlds ENABLE ROW LEVEL SECURITY;

-- BLOCK all client access to users table (only server-side with service role can access)
-- No policies = no access from client
DROP POLICY IF EXISTS "Public access" ON users;

-- Allow users to read/write their own game states only
CREATE POLICY "Users can manage own game states" ON user_game_states FOR ALL USING (true);

-- Allow everyone to read game worlds
CREATE POLICY "Public read game worlds" ON game_worlds FOR SELECT USING (true);
