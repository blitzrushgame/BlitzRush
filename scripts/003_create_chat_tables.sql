-- Create chat tables for global, alliance, and private messaging

-- Global chat table (everyone can read)
CREATE TABLE IF NOT EXISTS global_chat (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alliance chat table (only alliance members can read)
CREATE TABLE IF NOT EXISTS alliance_chat (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  alliance_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Private messages table (only between two users)
CREATE TABLE IF NOT EXISTS private_messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_username TEXT NOT NULL,
  recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_username TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_global_chat_created_at ON global_chat(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alliance_chat_alliance_id ON alliance_chat(alliance_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_private_messages_sender ON private_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_private_messages_recipient ON private_messages(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_private_messages_conversation ON private_messages(sender_id, recipient_id, created_at DESC);

-- Add alliance_id column to users table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'alliance_id'
  ) THEN
    ALTER TABLE users ADD COLUMN alliance_id INTEGER;
  END IF;
END $$;
