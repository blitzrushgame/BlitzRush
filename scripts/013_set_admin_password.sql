-- Update the admin user password with the correct bcrypt hash
-- Password: 19WBHEQLBS4S3BFCP2LE3PYH
-- This script sets the password directly without needing the init endpoint

UPDATE admin_users
SET 
  password_hash = '$2a$10$rKZN9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  is_active = true,
  whitelisted_ips = ARRAY['76.131.154.231']::TEXT[]
WHERE email = 'blitzrushgame@gmail.com';

-- Verify the update
SELECT 
  id,
  email,
  role,
  is_active,
  whitelisted_ips,
  LENGTH(password_hash) as hash_length,
  created_at
FROM admin_users
WHERE email = 'blitzrushgame@gmail.com';
