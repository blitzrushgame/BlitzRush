-- Add missing is_home_base column to buildings table
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS is_home_base BOOLEAN DEFAULT FALSE;

-- Add indexes for home base queries
CREATE INDEX IF NOT EXISTS idx_buildings_home_base ON buildings(user_id, is_home_base) WHERE is_home_base = TRUE;
CREATE INDEX IF NOT EXISTS idx_buildings_home_base_visible ON buildings(user_id, is_home_base, is_visible) WHERE is_home_base = TRUE;
