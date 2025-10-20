-- Complete Neon Database Initialization Script v2
-- Run this to set up all foundational tables

-- 1. Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS users_ip_address_idx ON users (ip_address);
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity);

-- 2. Create game_worlds table
CREATE TABLE IF NOT EXISTS game_worlds (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add width and height columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='game_worlds' AND column_name='width') THEN
    ALTER TABLE game_worlds ADD COLUMN width INTEGER NOT NULL DEFAULT 10000;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='game_worlds' AND column_name='height') THEN
    ALTER TABLE game_worlds ADD COLUMN height INTEGER NOT NULL DEFAULT 10000;
  END IF;
END $$;

-- Insert default world if it doesn't exist
INSERT INTO game_worlds (id, name, width, height)
VALUES (1, 'Main World', 10000, 10000)
ON CONFLICT (id) DO NOTHING;

-- 3. Create user_game_states table
CREATE TABLE IF NOT EXISTS user_game_states (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  world_id INTEGER NOT NULL REFERENCES game_worlds(id) ON DELETE CASCADE,
  game_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_played TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, world_id)
);

CREATE INDEX IF NOT EXISTS idx_user_game_states_user_id ON user_game_states(user_id);
CREATE INDEX IF NOT EXISTS idx_user_game_states_world_id ON user_game_states(world_id);
CREATE INDEX IF NOT EXISTS idx_user_game_states_last_played ON user_game_states(last_played);

-- 4. Create buildings table with visibility and activity tracking
CREATE TABLE IF NOT EXISTS buildings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  world_id INTEGER NOT NULL REFERENCES game_worlds(id) ON DELETE CASCADE,
  building_type TEXT NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  health INTEGER NOT NULL DEFAULT 100,
  max_health INTEGER NOT NULL DEFAULT 100,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  production_queue JSONB DEFAULT '[]'::jsonb,
  last_production_tick TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add is_home_base column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='buildings' AND column_name='is_home_base') THEN
    ALTER TABLE buildings ADD COLUMN is_home_base BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_buildings_user_id ON buildings(user_id);
CREATE INDEX IF NOT EXISTS idx_buildings_world_id ON buildings(world_id);
CREATE INDEX IF NOT EXISTS idx_buildings_position ON buildings(world_id, x, y);
CREATE INDEX IF NOT EXISTS idx_buildings_user_world ON buildings(user_id, world_id);
CREATE INDEX IF NOT EXISTS idx_buildings_type ON buildings(building_type);
CREATE INDEX IF NOT EXISTS idx_buildings_visible ON buildings(is_visible);
CREATE INDEX IF NOT EXISTS idx_buildings_user_visible ON buildings(user_id, is_visible);
CREATE INDEX IF NOT EXISTS idx_buildings_home_base ON buildings(user_id, is_home_base) WHERE is_home_base = TRUE;
CREATE INDEX IF NOT EXISTS idx_buildings_home_base_visible ON buildings(user_id, is_home_base, is_visible) WHERE is_home_base = TRUE;
