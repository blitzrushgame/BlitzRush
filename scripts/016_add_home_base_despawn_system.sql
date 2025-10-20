-- Add home base despawn/respawn system
-- Home bases despawn after 2 minutes of being offline
-- They respawn at a new location when the player logs back in

-- Add last_activity to users table to track when players are active
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add is_visible to buildings table to track if home bases are currently spawned
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity);
CREATE INDEX IF NOT EXISTS idx_buildings_visible ON buildings(world_id, is_visible) WHERE is_visible = TRUE;
CREATE INDEX IF NOT EXISTS idx_buildings_home_base_visible ON buildings(user_id, is_home_base, is_visible) WHERE is_home_base = TRUE;

-- Update existing users to have last_activity set to now
UPDATE users SET last_activity = NOW() WHERE last_activity IS NULL;

-- Update existing buildings to be visible
UPDATE buildings SET is_visible = TRUE WHERE is_visible IS NULL;
