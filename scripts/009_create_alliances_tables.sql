-- Create alliances table
CREATE TABLE IF NOT EXISTS alliances (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  tag TEXT NOT NULL UNIQUE, -- Short alliance tag (e.g., "PURG")
  description TEXT,
  leader_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_points INTEGER DEFAULT 0,
  total_bases INTEGER DEFAULT 0,
  member_count INTEGER DEFAULT 1,
  max_members INTEGER DEFAULT 100,
  is_public BOOLEAN DEFAULT true, -- Whether anyone can join or needs approval
  min_points_required INTEGER DEFAULT 0 -- Minimum points to join
);

-- Create alliance_members table to track roles
CREATE TABLE IF NOT EXISTS alliance_members (
  id SERIAL PRIMARY KEY,
  alliance_id INTEGER NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('leader', 'co-leader', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(alliance_id, user_id)
);

-- Create alliance join requests table
CREATE TABLE IF NOT EXISTS alliance_join_requests (
  id SERIAL PRIMARY KEY,
  alliance_id INTEGER NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(alliance_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_alliance_members_alliance_id ON alliance_members(alliance_id);
CREATE INDEX IF NOT EXISTS idx_alliance_members_user_id ON alliance_members(user_id);
CREATE INDEX IF NOT EXISTS idx_alliance_join_requests_alliance_id ON alliance_join_requests(alliance_id);
CREATE INDEX IF NOT EXISTS idx_alliance_join_requests_user_id ON alliance_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_alliances_leader_id ON alliances(leader_id);

-- Add Row Level Security policies
ALTER TABLE alliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliance_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliance_join_requests ENABLE ROW LEVEL SECURITY;

-- Alliances: Everyone can read, only members can see full details
CREATE POLICY "Anyone can view alliances" ON alliances FOR SELECT USING (true);
CREATE POLICY "Leaders can update their alliance" ON alliances FOR UPDATE USING (leader_id = (SELECT id FROM users WHERE username = current_user));
CREATE POLICY "Anyone can create an alliance" ON alliances FOR INSERT WITH CHECK (true);

-- Alliance members: Members can view their alliance members
CREATE POLICY "Members can view alliance members" ON alliance_members FOR SELECT USING (
  alliance_id IN (SELECT alliance_id FROM alliance_members WHERE user_id = (SELECT id FROM users WHERE username = current_user))
);
CREATE POLICY "Leaders and co-leaders can manage members" ON alliance_members FOR ALL USING (
  alliance_id IN (
    SELECT alliance_id FROM alliance_members 
    WHERE user_id = (SELECT id FROM users WHERE username = current_user) 
    AND role IN ('leader', 'co-leader')
  )
);

-- Join requests: Users can create their own requests, leaders/co-leaders can manage them
CREATE POLICY "Users can create join requests" ON alliance_join_requests FOR INSERT WITH CHECK (
  user_id = (SELECT id FROM users WHERE username = current_user)
);
CREATE POLICY "Users can view their own requests" ON alliance_join_requests FOR SELECT USING (
  user_id = (SELECT id FROM users WHERE username = current_user)
  OR alliance_id IN (
    SELECT alliance_id FROM alliance_members 
    WHERE user_id = (SELECT id FROM users WHERE username = current_user) 
    AND role IN ('leader', 'co-leader')
  )
);
CREATE POLICY "Leaders can manage join requests" ON alliance_join_requests FOR UPDATE USING (
  alliance_id IN (
    SELECT alliance_id FROM alliance_members 
    WHERE user_id = (SELECT id FROM users WHERE username = current_user) 
    AND role IN ('leader', 'co-leader')
  )
);
