-- Make usernames case-insensitive by storing them in lowercase
-- and adding a unique constraint on the lowercase version

-- Add a generated column for lowercase username
ALTER TABLE profiles 
ADD COLUMN username_lower TEXT GENERATED ALWAYS AS (LOWER(username)) STORED;

-- Create unique index on lowercase username
CREATE UNIQUE INDEX profiles_username_lower_key ON profiles(username_lower);

-- Update RLS policies to use case-insensitive matching
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
