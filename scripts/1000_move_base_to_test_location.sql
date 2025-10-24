-- Move user's home base to 1000:1000 for testing
-- This script moves the home base to a central test location

UPDATE buildings
SET 
  x = 1000,
  y = 1000,
  updated_at = NOW()
WHERE is_home_base = true
  AND user_id = (
    SELECT id FROM users 
    ORDER BY last_activity DESC 
    LIMIT 1
  );

-- Verify the update
SELECT 
  id,
  user_id,
  building_type,
  x,
  y,
  is_home_base,
  owner_username
FROM buildings
WHERE is_home_base = true
  AND user_id = (
    SELECT id FROM users 
    ORDER BY last_activity DESC 
    LIMIT 1
  );
