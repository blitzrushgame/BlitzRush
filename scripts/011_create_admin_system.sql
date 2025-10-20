-- Create admin_users table for secure admin authentication
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin', -- 'super_admin', 'admin', 'moderator'
  is_active BOOLEAN NOT NULL DEFAULT true,
  whitelisted_ips TEXT[], -- Array of allowed IP addresses
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  created_by INTEGER REFERENCES admin_users(id)
);

-- Create admin_audit_log table for tracking all admin actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL, -- 'login', 'update_user', 'delete_alliance', etc.
  resource_type TEXT, -- 'user', 'alliance', 'resource', etc.
  resource_id TEXT, -- ID of the affected resource
  details JSONB, -- Additional details about the action
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_resource ON admin_audit_log(resource_type, resource_id);

-- Insert the primary admin user
-- Password: 19WBHEQLBS4S3BFCP2LE3PYH (will be hashed by the application)
-- Note: This is a placeholder. The actual password hash will be inserted via the API
INSERT INTO admin_users (email, password_hash, role, is_active, whitelisted_ips)
VALUES (
  'blitzrushgame@gmail.com',
  '$2a$10$placeholder', -- This will be replaced by the actual hash
  'super_admin',
  true,
  NULL -- NULL means no IP restriction (will be set via environment variable)
)
ON CONFLICT (email) DO NOTHING;

-- Add role column to users table for future RBAC expansion
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'player';
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

COMMENT ON TABLE admin_users IS 'Stores admin user credentials and access control';
COMMENT ON TABLE admin_audit_log IS 'Audit trail for all admin actions';
COMMENT ON COLUMN admin_users.whitelisted_ips IS 'Array of IP addresses allowed to login. NULL = no restriction';
COMMENT ON COLUMN admin_audit_log.details IS 'JSON object with action-specific details';
