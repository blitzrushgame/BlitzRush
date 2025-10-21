-- Create user IP history table to track unique IPs per user
CREATE TABLE IF NOT EXISTS user_ip_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,
  UNIQUE(user_id, ip_address)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_ip_history_user_id ON user_ip_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ip_history_ip_address ON user_ip_history(ip_address);

-- Enable RLS
ALTER TABLE user_ip_history ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access
CREATE POLICY "Service role can manage IP history" ON user_ip_history
  FOR ALL
  USING (true)
  WITH CHECK (true);
