-- Create alliance invites table
CREATE TABLE IF NOT EXISTS alliance_invites (
  id SERIAL PRIMARY KEY,
  alliance_id INTEGER NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(alliance_id, user_id, status)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_alliance_invites_user_id ON alliance_invites(user_id);
CREATE INDEX IF NOT EXISTS idx_alliance_invites_alliance_id ON alliance_invites(alliance_id);
CREATE INDEX IF NOT EXISTS idx_alliance_invites_status ON alliance_invites(status);
