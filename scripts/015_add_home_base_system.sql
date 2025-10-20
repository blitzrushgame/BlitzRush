-- Add home base system to track player's main base
-- Home bases can be destroyed but not captured
-- Players get one home base that can be relocated

-- Add home_base_id to users table to track their home base
ALTER TABLE users ADD COLUMN IF NOT EXISTS home_base_id INTEGER REFERENCES buildings(id) ON DELETE SET NULL;

-- Add is_home_base flag to buildings table
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS is_home_base BOOLEAN DEFAULT FALSE;

-- Add owner_username to buildings for easier queries
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS owner_username TEXT;

-- Add base_type to buildings to distinguish different base types
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS base_type TEXT DEFAULT 'regular';
-- base_type options: 'home', 'regular', 'helicopter', 'naval', 'air', 'train_station'

-- Add is_neutral flag to track uncaptured bases
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS is_neutral BOOLEAN DEFAULT FALSE;

-- Add turret_count to track defensive turrets
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS turret_count INTEGER DEFAULT 0;

-- Add factory_level to track production capabilities
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS factory_level INTEGER DEFAULT 1;

-- Create index for home base lookups
CREATE INDEX IF NOT EXISTS idx_buildings_home_base ON buildings(user_id, is_home_base) WHERE is_home_base = TRUE;
CREATE INDEX IF NOT EXISTS idx_buildings_neutral ON buildings(world_id, is_neutral) WHERE is_neutral = TRUE;
CREATE INDEX IF NOT EXISTS idx_buildings_base_type ON buildings(base_type);

-- Add RLS policy for home bases
DROP POLICY IF EXISTS "Users can view all buildings in their world" ON buildings;
CREATE POLICY "Users can view all buildings in their world" ON buildings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can only modify their own buildings" ON buildings;
CREATE POLICY "Users can only modify their own buildings" ON buildings
  FOR UPDATE USING (auth.uid()::text::int = user_id);

DROP POLICY IF EXISTS "Users can create buildings" ON buildings;
CREATE POLICY "Users can create buildings" ON buildings
  FOR INSERT WITH CHECK (auth.uid()::text::int = user_id);
