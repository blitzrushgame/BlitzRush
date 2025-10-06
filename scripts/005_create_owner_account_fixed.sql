-- Create owner account (fixed version)
-- This bypasses the IP restriction by inserting directly into the database

INSERT INTO users (username, password, ip_address, created_at)
VALUES (
  'Owner',
  'owner123',
  '0.0.0.0',
  NOW()
)
ON CONFLICT (username) DO NOTHING;
