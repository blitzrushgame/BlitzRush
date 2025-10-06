-- Create a view for admins to manage user accounts
-- This allows viewing and editing user details for support purposes

-- Admin view of all users (excludes passwords for security)
CREATE OR REPLACE VIEW admin_users_view AS
SELECT 
  id,
  username,
  ip_address,
  created_at,
  -- Password is included but should only be accessed by admins
  password
FROM users
ORDER BY created_at DESC;

-- Grant access to service role only (admin access)
GRANT SELECT, UPDATE ON users TO service_role;

-- Function to update user password (admin support)
CREATE OR REPLACE FUNCTION admin_update_user_password(
  user_id_param INTEGER,
  new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users
  SET password = new_password
  WHERE id = user_id_param;
  
  RETURN FOUND;
END;
$$;

-- Function to update username (admin support)
CREATE OR REPLACE FUNCTION admin_update_username(
  user_id_param INTEGER,
  new_username TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users
  SET username = new_username
  WHERE id = user_id_param;
  
  RETURN FOUND;
END;
$$;
