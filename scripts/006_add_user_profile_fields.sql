-- Add profile customization fields to users table

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS profile_picture TEXT DEFAULT '/placeholder.svg?height=128&width=128',
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS leaderboard_rank INTEGER;

-- Create index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_users_points ON users(points DESC);

-- Update leaderboard ranks based on points
CREATE OR REPLACE FUNCTION update_leaderboard_ranks()
RETURNS void AS $$
BEGIN
  WITH ranked_users AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY points DESC) as rank
    FROM users
  )
  UPDATE users
  SET leaderboard_rank = ranked_users.rank
  FROM ranked_users
  WHERE users.id = ranked_users.id;
END;
$$ LANGUAGE plpgsql;

-- Run initial rank calculation
SELECT update_leaderboard_ranks();
