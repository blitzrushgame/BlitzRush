-- Create buildings table for tracking all structures in the game (Neon-compatible)
CREATE TABLE IF NOT EXISTS buildings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  world_id INTEGER NOT NULL REFERENCES game_worlds(id) ON DELETE CASCADE,
  building_type TEXT NOT NULL, -- 'base', 'barracks', 'factory', 'mine', 'defense_tower', etc.
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  health INTEGER NOT NULL DEFAULT 100,
  max_health INTEGER NOT NULL DEFAULT 100,
  production_queue JSONB DEFAULT '[]'::jsonb, -- Array of items being produced
  last_production_tick TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_buildings_user_id ON buildings(user_id);
CREATE INDEX IF NOT EXISTS idx_buildings_world_id ON buildings(world_id);
CREATE INDEX IF NOT EXISTS idx_buildings_position ON buildings(world_id, x, y);
CREATE INDEX IF NOT EXISTS idx_buildings_user_world ON buildings(user_id, world_id);
CREATE INDEX IF NOT EXISTS idx_buildings_type ON buildings(building_type);
