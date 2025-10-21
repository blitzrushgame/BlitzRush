-- Insert or update admin account with plaintext password
-- Fixed column name from 'password' to 'password_hash'
INSERT INTO admin_users (email, password_hash, whitelisted_ips, is_active)
VALUES (
  'blitzrushgame@gmail.com',
  '19WBHEQLBS4S3BFCP2LE3PYH',
  ARRAY['76.131.154.231'],
  true
)
ON CONFLICT (email) 
DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  whitelisted_ips = EXCLUDED.whitelisted_ips,
  is_active = EXCLUDED.is_active;
