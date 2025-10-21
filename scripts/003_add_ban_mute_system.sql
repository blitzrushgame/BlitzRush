-- Add ban and mute system to users table

-- Add ban fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_type TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_by_admin_id INTEGER;

-- Add mute fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mute_type TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mute_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS muted_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS muted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS muted_by_admin_id INTEGER;

-- Update banned_ips table to add missing columns
ALTER TABLE banned_ips ADD COLUMN IF NOT EXISTS ban_type TEXT DEFAULT 'permanent';
ALTER TABLE banned_ips ADD COLUMN IF NOT EXISTS banned_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE banned_ips ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE banned_ips ADD COLUMN IF NOT EXISTS banned_by_admin_id INTEGER;

-- Create moderation log table
CREATE TABLE IF NOT EXISTS moderation_log (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER,
  action_type TEXT NOT NULL,
  target_user_id INTEGER,
  target_ip TEXT,
  reason TEXT,
  duration_type TEXT,
  duration_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes (only after columns are confirmed to exist)
DO $$
BEGIN
  -- Indexes for users table
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_banned') THEN
    CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned) WHERE is_banned = TRUE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_muted') THEN
    CREATE INDEX IF NOT EXISTS idx_users_is_muted ON users(is_muted) WHERE is_muted = TRUE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'banned_until') THEN
    CREATE INDEX IF NOT EXISTS idx_users_banned_until ON users(banned_until) WHERE banned_until IS NOT NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'muted_until') THEN
    CREATE INDEX IF NOT EXISTS idx_users_muted_until ON users(muted_until) WHERE muted_until IS NOT NULL;
  END IF;
  
  -- Indexes for banned_ips table
  CREATE INDEX IF NOT EXISTS idx_banned_ips_ip_address ON banned_ips(ip_address);
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'banned_ips' AND column_name = 'banned_until') THEN
    CREATE INDEX IF NOT EXISTS idx_banned_ips_banned_until ON banned_ips(banned_until) WHERE banned_until IS NOT NULL;
  END IF;
  
  -- Indexes for moderation_log table
  CREATE INDEX IF NOT EXISTS idx_moderation_log_admin_id ON moderation_log(admin_id);
  CREATE INDEX IF NOT EXISTS idx_moderation_log_target_user_id ON moderation_log(target_user_id);
  CREATE INDEX IF NOT EXISTS idx_moderation_log_created_at ON moderation_log(created_at DESC);
END $$;
