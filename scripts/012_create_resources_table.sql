-- Create resources table for tracking player resources
CREATE TABLE IF NOT EXISTS resources (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  world_id INTEGER NOT NULL REFERENCES game_worlds(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL, -- 'gold', 'wood', 'stone', 'oil', 'energy', etc.
  amount INTEGER NOT NULL DEFAULT 0,
  production_rate INTEGER NOT NULL DEFAULT 0, -- Per hour
  storage_capacity INTEGER NOT NULL DEFAULT 10000,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, world_id, resource_type)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_resources_user_id ON resources(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_world_id ON resources(world_id);
CREATE INDEX IF NOT EXISTS idx_resources_user_world ON resources(user_id, world_id);

-- Enable RLS
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for resources
DROP POLICY IF EXISTS "Users can view their own resources" ON resources;
CREATE POLICY "Users can view their own resources"
  ON resources FOR SELECT
  USING (auth.uid()::text::integer = user_id);

DROP POLICY IF EXISTS "Users can insert their own resources" ON resources;
CREATE POLICY "Users can insert their own resources"
  ON resources FOR INSERT
  WITH CHECK (auth.uid()::text::integer = user_id);

DROP POLICY IF EXISTS "Users can update their own resources" ON resources;
CREATE POLICY "Users can update their own resources"
  ON resources FOR UPDATE
  USING (auth.uid()::text::integer = user_id);

DROP POLICY IF EXISTS "Users can delete their own resources" ON resources;
CREATE POLICY "Users can delete their own resources"
  ON resources FOR DELETE
  USING (auth.uid()::text::integer = user_id);
