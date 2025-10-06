-- Sync alliance_id for all existing alliance members
-- This updates the users table based on current alliance_members records

UPDATE users
SET alliance_id = alliance_members.alliance_id
FROM alliance_members
WHERE users.id = alliance_members.user_id;

-- Log the results
SELECT 
  COUNT(*) as synced_users,
  'Alliance IDs synced successfully' as message
FROM users
WHERE alliance_id IS NOT NULL;
