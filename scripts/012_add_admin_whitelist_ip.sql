-- Add IP address to admin whitelist
-- This script adds 76.131.154.231 to the whitelisted_ips array for the admin user

UPDATE admin_users
SET whitelisted_ips = ARRAY['76.131.154.231']
WHERE email = 'blitzrushgame@gmail.com';

-- Verify the update
SELECT id, email, whitelisted_ips, created_at
FROM admin_users
WHERE email = 'blitzrushgame@gmail.com';
