-- Update admin user with plaintext password
-- Database is private and admin panel has IP whitelisting

UPDATE admin_users
SET 
  password_hash = '19WBHEQLBS4S3BFCP2LE3PYH',
  whitelisted_ips = ARRAY['76.131.154.231']::text[],
  is_active = true
WHERE email = 'blitzrushgame@gmail.com';

-- If admin doesn't exist, create it
INSERT INTO admin_users (email, password_hash, role, is_active, whitelisted_ips)
VALUES ('blitzrushgame@gmail.com', '19WBHEQLBS4S3BFCP2LE3PYH', 'super_admin', true, ARRAY['76.131.154.231']::text[])
ON CONFLICT (email) DO NOTHING;
