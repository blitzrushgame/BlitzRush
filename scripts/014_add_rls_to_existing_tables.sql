-- Add RLS policies to existing tables that don't have them yet

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliance_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliance_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliance_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliance_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliance_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_worlds ENABLE ROW LEVEL SECURITY;

-- Users table policies
DROP POLICY IF EXISTS "Users can view all users" ON users;
CREATE POLICY "Users can view all users"
  ON users FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid()::text::integer = id);

-- User game states policies
DROP POLICY IF EXISTS "Users can view their own game states" ON user_game_states;
CREATE POLICY "Users can view their own game states"
  ON user_game_states FOR SELECT
  USING (auth.uid()::text::integer = user_id);

DROP POLICY IF EXISTS "Users can insert their own game states" ON user_game_states;
CREATE POLICY "Users can insert their own game states"
  ON user_game_states FOR INSERT
  WITH CHECK (auth.uid()::text::integer = user_id);

DROP POLICY IF EXISTS "Users can update their own game states" ON user_game_states;
CREATE POLICY "Users can update their own game states"
  ON user_game_states FOR UPDATE
  USING (auth.uid()::text::integer = user_id);

-- Alliance members policies
DROP POLICY IF EXISTS "Users can view alliance members" ON alliance_members;
CREATE POLICY "Users can view alliance members"
  ON alliance_members FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can manage their alliance members" ON alliance_members;
CREATE POLICY "Users can manage their alliance members"
  ON alliance_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM alliance_members am
      WHERE am.alliance_id = alliance_members.alliance_id
      AND am.user_id = auth.uid()::text::integer
      AND am.role IN ('leader', 'officer')
    )
  );

-- Alliance chat policies
DROP POLICY IF EXISTS "Alliance members can view their alliance chat" ON alliance_chat;
CREATE POLICY "Alliance members can view their alliance chat"
  ON alliance_chat FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM alliance_members am
      WHERE am.alliance_id = alliance_chat.alliance_id
      AND am.user_id = auth.uid()::text::integer
    )
  );

DROP POLICY IF EXISTS "Alliance members can send messages" ON alliance_chat;
CREATE POLICY "Alliance members can send messages"
  ON alliance_chat FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM alliance_members am
      WHERE am.alliance_id = alliance_chat.alliance_id
      AND am.user_id = auth.uid()::text::integer
    )
  );

-- Alliance invites policies
DROP POLICY IF EXISTS "Users can view their own invites" ON alliance_invites;
CREATE POLICY "Users can view their own invites"
  ON alliance_invites FOR SELECT
  USING (auth.uid()::text::integer = user_id);

DROP POLICY IF EXISTS "Alliance leaders can send invites" ON alliance_invites;
CREATE POLICY "Alliance leaders can send invites"
  ON alliance_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM alliance_members am
      WHERE am.alliance_id = alliance_invites.alliance_id
      AND am.user_id = auth.uid()::text::integer
      AND am.role IN ('leader', 'officer')
    )
  );

-- Alliance join requests policies
DROP POLICY IF EXISTS "Users can view requests for their alliance" ON alliance_join_requests;
CREATE POLICY "Users can view requests for their alliance"
  ON alliance_join_requests FOR SELECT
  USING (
    auth.uid()::text::integer = user_id OR
    EXISTS (
      SELECT 1 FROM alliance_members am
      WHERE am.alliance_id = alliance_join_requests.alliance_id
      AND am.user_id = auth.uid()::text::integer
      AND am.role IN ('leader', 'officer')
    )
  );

DROP POLICY IF EXISTS "Users can create join requests" ON alliance_join_requests;
CREATE POLICY "Users can create join requests"
  ON alliance_join_requests FOR INSERT
  WITH CHECK (auth.uid()::text::integer = user_id);

-- Alliance news policies
DROP POLICY IF EXISTS "Alliance members can view alliance news" ON alliance_news;
CREATE POLICY "Alliance members can view alliance news"
  ON alliance_news FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM alliance_members am
      WHERE am.alliance_id = alliance_news.alliance_id
      AND am.user_id = auth.uid()::text::integer
    )
  );

DROP POLICY IF EXISTS "Alliance leaders can manage news" ON alliance_news;
CREATE POLICY "Alliance leaders can manage news"
  ON alliance_news FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM alliance_members am
      WHERE am.alliance_id = alliance_news.alliance_id
      AND am.user_id = auth.uid()::text::integer
      AND am.role IN ('leader', 'officer')
    )
  );

-- Global chat policies
DROP POLICY IF EXISTS "Everyone can view global chat" ON global_chat;
CREATE POLICY "Everyone can view global chat"
  ON global_chat FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can send global messages" ON global_chat;
CREATE POLICY "Users can send global messages"
  ON global_chat FOR INSERT
  WITH CHECK (auth.uid()::text::integer = user_id);

-- Private messages policies
DROP POLICY IF EXISTS "Users can view their own messages" ON private_messages;
CREATE POLICY "Users can view their own messages"
  ON private_messages FOR SELECT
  USING (
    auth.uid()::text::integer = sender_id OR 
    auth.uid()::text::integer = recipient_id
  );

DROP POLICY IF EXISTS "Users can send private messages" ON private_messages;
CREATE POLICY "Users can send private messages"
  ON private_messages FOR INSERT
  WITH CHECK (auth.uid()::text::integer = sender_id);

DROP POLICY IF EXISTS "Users can update their received messages" ON private_messages;
CREATE POLICY "Users can update their received messages"
  ON private_messages FOR UPDATE
  USING (auth.uid()::text::integer = recipient_id);

-- Game worlds policies (read-only for everyone)
DROP POLICY IF EXISTS "Everyone can view game worlds" ON game_worlds;
CREATE POLICY "Everyone can view game worlds"
  ON game_worlds FOR SELECT
  USING (true);
