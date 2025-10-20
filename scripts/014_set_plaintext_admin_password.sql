-- WARNING: This stores the password in PLAINTEXT which is EXTREMELY INSECURE
-- This should ONLY be used for development/testing
-- DO NOT use this in production!

UPDATE admin_users
SET 
  password_hash = '19WBHEQLBS4S3BFCP2LE3PYH',
  whitelisted_ips = ARRAY['76.131.154.231']
WHERE email = 'blitzrushgame@gmail.com';

-- Verify the update
SELECT 
  id, 
  email, 
  password_hash,
  whitelisted_ips,
  is_active
FROM admin_users
WHERE email = 'blitzrushgame@gmail.com';
