-- Create base_defenses table to store turret/flak data
CREATE TABLE IF NOT EXISTS base_defenses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  base_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  defense_type VARCHAR(50) NOT NULL DEFAULT 'missile',
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 4),
  count INTEGER NOT NULL DEFAULT 2 CHECK (count >= 0 AND count <= 30),
  damage_multiplier DECIMAL(10, 2) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, base_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_base_defenses_user_id ON base_defenses(user_id);
CREATE INDEX IF NOT EXISTS idx_base_defenses_base_id ON base_defenses(base_id);

-- Add RLS policies
ALTER TABLE base_defenses ENABLE ROW LEVEL SECURITY;

-- Users can view their own defenses
CREATE POLICY "Users can view own defenses"
  ON base_defenses FOR SELECT
  USING (auth.uid()::text = (SELECT auth_user_id FROM users WHERE id = user_id));

-- Users can insert their own defenses
CREATE POLICY "Users can insert own defenses"
  ON base_defenses FOR INSERT
  WITH CHECK (auth.uid()::text = (SELECT auth_user_id FROM users WHERE id = user_id));

-- Users can update their own defenses
CREATE POLICY "Users can update own defenses"
  ON base_defenses FOR UPDATE
  USING (auth.uid()::text = (SELECT auth_user_id FROM users WHERE id = user_id));

-- Users can delete their own defenses
CREATE POLICY "Users can delete own defenses"
  ON base_defenses FOR DELETE
  USING (auth.uid()::text = (SELECT auth_user_id FROM users WHERE id = user_id));
