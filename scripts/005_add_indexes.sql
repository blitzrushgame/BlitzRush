-- Add performance indexes for frequently queried tables
-- Create indexes for better query performance

-- User game states indexes
CREATE INDEX IF NOT EXISTS idx_user_game_states_user_id ON user_game_states(user_id);
CREATE INDEX IF NOT EXISTS idx_user_game_states_world_id ON user_game_states(world_id);
CREATE INDEX IF NOT EXISTS idx_user_game_states_last_played ON user_game_states(last_played);

-- Alliance indexes
CREATE INDEX IF NOT EXISTS idx_alliance_members_user_id ON alliance_members(user_id);
CREATE INDEX IF NOT EXISTS idx_alliance_members_alliance_id ON alliance_members(alliance_id);
CREATE INDEX IF NOT EXISTS idx_users_alliance_id ON users(alliance_id);

-- Chat indexes
CREATE INDEX IF NOT EXISTS idx_alliance_chat_alliance_id ON alliance_chat(alliance_id);
CREATE INDEX IF NOT EXISTS idx_alliance_chat_created_at ON alliance_chat(created_at);
CREATE INDEX IF NOT EXISTS idx_global_chat_created_at ON global_chat(created_at);

-- Private messages indexes
CREATE INDEX IF NOT EXISTS idx_private_messages_sender_id ON private_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_recipient_id ON private_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_created_at ON private_messages(created_at);
