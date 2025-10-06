-- Create owner account bypassing IP restrictions
-- This script creates a user account directly in the database

-- Insert the owner user
INSERT INTO users (username, password, ip_address, created_at)
VALUES (
  'Owner',
  'owner123',  -- Plain text password as configured
  '0.0.0.0',  -- Placeholder IP that won't conflict
  NOW()
)
ON CONFLICT (username) DO NOTHING;  -- Won't create duplicate if username already exists
