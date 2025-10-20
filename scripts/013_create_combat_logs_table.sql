-- Create combat logs table for tracking battles and attacks
CREATE TABLE IF NOT EXISTS combat_logs (
  id SERIAL PRIMARY KEY,
  world_id INTEGER NOT NULL REFERENCES game_worlds(id) ON DELETE CASCADE,
  attacker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  defender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attacker_username TEXT NOT NULL,
  defender_username TEXT NOT NULL,
  battle_location_x INTEGER NOT NULL,
  battle_location_y INTEGER NOT NULL,
  result JSONB NOT NULL, -- Detailed battle results (units lost, damage dealt, winner, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_combat_logs_world_id ON combat_logs(world_id);
CREATE INDEX IF NOT EXISTS idx_combat_logs_attacker_id ON combat_logs(attacker_id);
CREATE INDEX IF NOT EXISTS idx_combat_logs_defender_id ON combat_logs(defender_id);
CREATE INDEX IF NOT EXISTS idx_combat_logs_created_at ON combat_logs(created_at);

-- Enable RLS
ALTER TABLE combat_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for combat logs
DROP POLICY IF EXISTS "Users can view combat logs they're involved in" ON combat_logs;
CREATE POLICY "Users can view combat logs they're involved in"
  ON combat_logs FOR SELECT
  USING (
    auth.uid()::text::integer = attacker_id OR 
    auth.uid()::text::integer = defender_id
  );

DROP POLICY IF EXISTS "System can insert combat logs" ON combat_logs;
CREATE POLICY "System can insert combat logs"
  ON combat_logs FOR INSERT
  WITH CHECK (true); -- Server will handle insertions
