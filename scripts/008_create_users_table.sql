-- Create simple users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Case-insensitive unique username index
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (LOWER(username));

-- One account per IP constraint
CREATE UNIQUE INDEX IF NOT EXISTS users_ip_address_idx ON users (ip_address);

-- Enable RLS and block all client-side access
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- No policies = no client access (only service role can access)
