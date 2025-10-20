-- Migrate users table to work with Supabase Auth
-- This script adds auth_user_id column and sets up Row Level Security

-- Add auth_user_id column to link with Supabase Auth
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

-- Enable Row Level Security on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "users_select_own" ON users
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- Policy: Users can update their own profile
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (auth.uid() = auth_user_id);

-- Policy: Allow service role to insert users (for registration)
CREATE POLICY "users_insert_service" ON users
  FOR INSERT
  WITH CHECK (true);

-- Enable RLS on other user-related tables
ALTER TABLE user_game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own game states
CREATE POLICY "game_states_select_own" ON user_game_states
  FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Policy: Users can update their own game states
CREATE POLICY "game_states_update_own" ON user_game_states
  FOR UPDATE
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Policy: Users can insert their own game states
CREATE POLICY "game_states_insert_own" ON user_game_states
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Policy: Users can view their own resources
CREATE POLICY "resources_select_own" ON resources
  FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Policy: Users can update their own resources
CREATE POLICY "resources_update_own" ON resources
  FOR UPDATE
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Policy: Users can insert their own resources
CREATE POLICY "resources_insert_own" ON resources
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Policy: Users can view their own buildings
CREATE POLICY "buildings_select_own" ON buildings
  FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Policy: Users can update their own buildings
CREATE POLICY "buildings_update_own" ON buildings
  FOR UPDATE
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Policy: Users can insert their own buildings
CREATE POLICY "buildings_insert_own" ON buildings
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Policy: Users can delete their own buildings
CREATE POLICY "buildings_delete_own" ON buildings
  FOR DELETE
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Policy: Users can view their own units
CREATE POLICY "units_select_own" ON units
  FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Policy: Users can update their own units
CREATE POLICY "units_update_own" ON units
  FOR UPDATE
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Policy: Users can insert their own units
CREATE POLICY "units_insert_own" ON units
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Policy: Users can delete their own units
CREATE POLICY "units_delete_own" ON units
  FOR DELETE
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Enable RLS on alliance tables
ALTER TABLE alliance_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliance_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliance_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliance_join_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view alliance members if they're in the alliance
CREATE POLICY "alliance_members_select" ON alliance_members
  FOR SELECT
  USING (
    alliance_id IN (
      SELECT alliance_id FROM alliance_members 
      WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

-- Policy: Users can view alliance chat if they're in the alliance
CREATE POLICY "alliance_chat_select" ON alliance_chat
  FOR SELECT
  USING (
    alliance_id IN (
      SELECT alliance_id FROM alliance_members 
      WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

-- Policy: Users can insert alliance chat if they're in the alliance
CREATE POLICY "alliance_chat_insert" ON alliance_chat
  FOR INSERT
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    AND alliance_id IN (
      SELECT alliance_id FROM alliance_members 
      WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

-- Policy: Users can view their own invites
CREATE POLICY "alliance_invites_select_own" ON alliance_invites
  FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Policy: Users can update their own invites
CREATE POLICY "alliance_invites_update_own" ON alliance_invites
  FOR UPDATE
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Policy: Users can view join requests for their alliance
CREATE POLICY "alliance_requests_select" ON alliance_join_requests
  FOR SELECT
  USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    OR alliance_id IN (
      SELECT alliance_id FROM alliance_members 
      WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
      AND role = 'leader'
    )
  );

-- Enable RLS on chat tables
ALTER TABLE global_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view global chat
CREATE POLICY "global_chat_select_all" ON global_chat
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert global chat
CREATE POLICY "global_chat_insert_auth" ON global_chat
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Policy: Users can view their own private messages
CREATE POLICY "private_messages_select_own" ON private_messages
  FOR SELECT
  USING (
    sender_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    OR recipient_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Policy: Users can insert private messages as sender
CREATE POLICY "private_messages_insert_own" ON private_messages
  FOR INSERT
  WITH CHECK (sender_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Policy: Users can update their received messages (mark as read)
CREATE POLICY "private_messages_update_recipient" ON private_messages
  FOR UPDATE
  USING (recipient_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));
