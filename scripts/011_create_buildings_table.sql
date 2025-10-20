-- Create buildings table for tracking all structures in the game
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

-- Enable RLS
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for buildings
DROP POLICY IF EXISTS "Users can view all buildings in their world" ON buildings;
CREATE POLICY "Users can view all buildings in their world"
  ON buildings FOR SELECT
  USING (true); -- Everyone can see all buildings (for game visibility)

DROP POLICY IF EXISTS "Users can insert their own buildings" ON buildings;
CREATE POLICY "Users can insert their own buildings"
  ON buildings FOR INSERT
  WITH CHECK (auth.uid()::text::integer = user_id);

DROP POLICY IF EXISTS "Users can update their own buildings" ON buildings;
CREATE POLICY "Users can update their own buildings"
  ON buildings FOR UPDATE
  USING (auth.uid()::text::integer = user_id);

DROP POLICY IF EXISTS "Users can delete their own buildings" ON buildings;
CREATE POLICY "Users can delete their own buildings"
  ON buildings FOR DELETE
  USING (auth.uid()::text::integer = user_id);
