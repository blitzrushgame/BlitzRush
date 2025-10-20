-- Phase 1: Database Schema Optimization for Real-Time Gameplay
-- This script adds timestamps, indexes, and triggers to support server-authoritative gameplay

-- ============================================================================
-- STEP 1: Add last_updated timestamps to key tables
-- ============================================================================

-- Add last_updated to user_game_states
ALTER TABLE user_game_states 
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add last_updated to users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add last_updated to alliances
ALTER TABLE alliances 
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add last_updated to alliance_members
ALTER TABLE alliance_members 
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add last_updated to alliance_news
ALTER TABLE alliance_news 
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================================================
-- STEP 2: Create function to auto-update last_updated timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: Create triggers to auto-update timestamps on UPDATE
-- ============================================================================

-- Trigger for user_game_states
DROP TRIGGER IF EXISTS update_user_game_states_last_updated ON user_game_states;
CREATE TRIGGER update_user_game_states_last_updated
    BEFORE UPDATE ON user_game_states
    FOR EACH ROW
    EXECUTE FUNCTION update_last_updated_column();

-- Trigger for users
DROP TRIGGER IF EXISTS update_users_last_updated ON users;
CREATE TRIGGER update_users_last_updated
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_last_updated_column();

-- Trigger for alliances
DROP TRIGGER IF EXISTS update_alliances_last_updated ON alliances;
CREATE TRIGGER update_alliances_last_updated
    BEFORE UPDATE ON alliances
    FOR EACH ROW
    EXECUTE FUNCTION update_last_updated_column();

-- Trigger for alliance_members
DROP TRIGGER IF EXISTS update_alliance_members_last_updated ON alliance_members;
CREATE TRIGGER update_alliance_members_last_updated
    BEFORE UPDATE ON alliance_members
    FOR EACH ROW
    EXECUTE FUNCTION update_last_updated_column();

-- Trigger for alliance_news
DROP TRIGGER IF EXISTS update_alliance_news_last_updated ON alliance_news;
CREATE TRIGGER update_alliance_news_last_updated
    BEFORE UPDATE ON alliance_news
    FOR EACH ROW
    EXECUTE FUNCTION update_last_updated_column();

-- ============================================================================
-- STEP 4: Add indexes for frequently queried data
-- ============================================================================

-- Index for fetching a specific player's game state in a world
CREATE INDEX IF NOT EXISTS idx_user_game_states_user_world 
ON user_game_states(user_id, world_id);

-- Index for fetching recent updates in a world (for real-time sync)
CREATE INDEX IF NOT EXISTS idx_user_game_states_world_updated 
ON user_game_states(world_id, last_updated DESC);

-- Index for fetching all game states in a world (for rendering other players)
CREATE INDEX IF NOT EXISTS idx_user_game_states_world 
ON user_game_states(world_id);

-- Index for fetching users by alliance
CREATE INDEX IF NOT EXISTS idx_users_alliance 
ON users(alliance_id) WHERE alliance_id IS NOT NULL;

-- Index for fetching alliance members
CREATE INDEX IF NOT EXISTS idx_alliance_members_alliance 
ON alliance_members(alliance_id);

-- Index for checking a user's alliance membership
CREATE INDEX IF NOT EXISTS idx_alliance_members_user 
ON alliance_members(user_id);

-- Index for fetching alliance news
CREATE INDEX IF NOT EXISTS idx_alliance_news_alliance_created 
ON alliance_news(alliance_id, created_at DESC);

-- Index for username lookups (for chat, leaderboards, etc.)
CREATE INDEX IF NOT EXISTS idx_users_username 
ON users(username);

-- ============================================================================
-- STEP 5: Enable Realtime for key tables
-- ============================================================================

-- Added conditional checks to only add tables if not already in publication

-- Enable realtime for user_game_states (most important for live gameplay)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_game_states'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_game_states;
  END IF;
END $$;

-- Enable realtime for users (for player status, resources, etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE users;
  END IF;
END $$;

-- Enable realtime for alliances (for alliance stats updates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'alliances'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE alliances;
  END IF;
END $$;

-- Enable realtime for alliance_members (for membership changes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'alliance_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE alliance_members;
  END IF;
END $$;

-- Enable realtime for alliance_news (for live news updates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'alliance_news'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE alliance_news;
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Update existing rows to have last_updated = created_at
-- ============================================================================

-- Update user_game_states
UPDATE user_game_states 
SET last_updated = created_at 
WHERE last_updated IS NULL;

-- Update users
UPDATE users 
SET last_updated = created_at 
WHERE last_updated IS NULL;

-- Update alliances
UPDATE alliances 
SET last_updated = created_at 
WHERE last_updated IS NULL;

-- Update alliance_members
UPDATE alliance_members 
SET last_updated = joined_at 
WHERE last_updated IS NULL;

-- Update alliance_news
UPDATE alliance_news 
SET last_updated = created_at 
WHERE last_updated IS NULL;

-- ============================================================================
-- STEP 7: Add helpful views for real-time queries
-- ============================================================================

-- View for getting all active players in a world with their latest update time
CREATE OR REPLACE VIEW active_players_by_world AS
SELECT 
    ugs.world_id,
    ugs.user_id,
    u.username,
    u.alliance_id,
    ugs.last_updated,
    ugs.game_data
FROM user_game_states ugs
JOIN users u ON u.id = ugs.user_id
ORDER BY ugs.world_id, ugs.last_updated DESC;

-- View for getting recent game state changes (useful for debugging)
CREATE OR REPLACE VIEW recent_game_updates AS
SELECT 
    ugs.world_id,
    u.username,
    ugs.last_updated,
    ugs.game_data
FROM user_game_states ugs
JOIN users u ON u.id = ugs.user_id
WHERE ugs.last_updated > NOW() - INTERVAL '5 minutes'
ORDER BY ugs.last_updated DESC;

-- ============================================================================
-- VERIFICATION QUERIES (run these to verify the migration worked)
-- ============================================================================

-- Check that all tables have last_updated columns
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name IN ('user_game_states', 'users', 'alliances', 'alliance_members', 'alliance_news')
-- AND column_name = 'last_updated';

-- Check that all indexes were created
-- SELECT tablename, indexname 
-- FROM pg_indexes 
-- WHERE tablename IN ('user_game_states', 'users', 'alliances', 'alliance_members', 'alliance_news')
-- ORDER BY tablename, indexname;

-- Check that triggers were created
-- SELECT trigger_name, event_object_table 
-- FROM information_schema.triggers 
-- WHERE trigger_name LIKE '%last_updated%';
