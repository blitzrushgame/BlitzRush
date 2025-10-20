-- Rewritten to work with the users table instead of profiles
-- Make usernames case-insensitive by adding a unique index on lowercase username

-- Create unique index on lowercase username
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_key ON users(LOWER(username));

-- Note: The database will now enforce case-insensitive uniqueness on usernames
-- When checking if a username exists, use: WHERE LOWER(username) = LOWER($1)
