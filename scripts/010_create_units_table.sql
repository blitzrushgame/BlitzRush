-- Create units table for tracking all military units in the game
CREATE TABLE IF NOT EXISTS units (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  world_id INTEGER NOT NULL REFERENCES game_worlds(id) ON DELETE CASCADE,
  unit_type TEXT NOT NULL, -- 'soldier', 'tank', 'aircraft', etc.
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  health INTEGER NOT NULL DEFAULT 100,
  max_health INTEGER NOT NULL DEFAULT 100,
  attack INTEGER NOT NULL DEFAULT 10,
  defense INTEGER NOT NULL DEFAULT 5,
  movement_speed INTEGER NOT NULL DEFAULT 1,
  is_moving BOOLEAN DEFAULT FALSE,
  target_x INTEGER,
  target_y INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_units_user_id ON units(user_id);
CREATE INDEX IF NOT EXISTS idx_units_world_id ON units(world_id);
CREATE INDEX IF NOT EXISTS idx_units_position ON units(world_id, x, y);
CREATE INDEX IF NOT EXISTS idx_units_user_world ON units(user_id, world_id);

-- Enable RLS
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- RLS Policies for units
DROP POLICY IF EXISTS "Users can view all units in their world" ON units;
CREATE POLICY "Users can view all units in their world"
  ON units FOR SELECT
  USING (true); -- Everyone can see all units (for game visibility)

DROP POLICY IF EXISTS "Users can insert their own units" ON units;
CREATE POLICY "Users can insert their own units"
  ON units FOR INSERT
  WITH CHECK (auth.uid()::text::integer = user_id);

DROP POLICY IF EXISTS "Users can update their own units" ON units;
CREATE POLICY "Users can update their own units"
  ON units FOR UPDATE
  USING (auth.uid()::text::integer = user_id);

DROP POLICY IF EXISTS "Users can delete their own units" ON units;
CREATE POLICY "Users can delete their own units"
  ON units FOR DELETE
  USING (auth.uid()::text::integer = user_id);
