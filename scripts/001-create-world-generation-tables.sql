-- Create worlds table for tracking game worlds
CREATE TABLE IF NOT EXISTS worlds (
  id SERIAL PRIMARY KEY,
  world_number INTEGER UNIQUE NOT NULL,
  seed BIGINT NOT NULL,
  status TEXT DEFAULT 'genesis' CHECK (status IN ('genesis', 'active', 'escalation', 'closed')),
  map_size INTEGER DEFAULT 5000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  escalation_triggered_at TIMESTAMP WITH TIME ZONE,
  target_release_date TIMESTAMP WITH TIME ZONE,
  total_bases_spawned INTEGER DEFAULT 0,
  player_count INTEGER DEFAULT 0,
  claim_rate_per_hour FLOAT DEFAULT 0,
  last_metrics_update TIMESTAMP WITH TIME ZONE
);

-- Store river paths
CREATE TABLE IF NOT EXISTS world_rivers (
  id SERIAL PRIMARY KEY,
  world_id INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  river_index INTEGER NOT NULL,
  path_points JSONB NOT NULL, -- Array of {x, y} key points
  width FLOAT DEFAULT 15,
  flow_direction INTEGER, -- 0-360 degrees
  total_length FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store railroad networks
CREATE TABLE IF NOT EXISTS world_railroads (
  id SERIAL PRIMARY KEY,
  world_id INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  railroad_index INTEGER NOT NULL,
  path_points JSONB NOT NULL, -- Array of {x, y} key points
  railroad_type TEXT DEFAULT 'trunk', -- 'trunk' or 'branch'
  total_length FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store bridge placements
CREATE TABLE IF NOT EXISTS world_bridges (
  id SERIAL PRIMARY KEY,
  world_id INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  river_id INTEGER REFERENCES world_rivers(id) ON DELETE CASCADE,
  railroad_id INTEGER REFERENCES world_railroads(id) ON DELETE CASCADE,
  position JSONB NOT NULL, -- {x, y}
  rotation FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store base zones (define WHERE bases spawn)
CREATE TABLE IF NOT EXISTS world_base_zones (
  id SERIAL PRIMARY KEY,
  world_id INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  zone_type TEXT NOT NULL, -- 'standard', 'railroad_hub', 'river_dock', 'air_field', 'capital'
  center_x FLOAT NOT NULL,
  center_y FLOAT NOT NULL,
  radius FLOAT NOT NULL,
  associated_feature_id INTEGER, -- References railroad or river
  base_count INTEGER DEFAULT 1,
  specialization TEXT, -- 'ground', 'heli', 'air', 'naval', 'train'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track base spawn events
CREATE TABLE IF NOT EXISTS base_spawn_events (
  id SERIAL PRIMARY KEY,
  world_id INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  spawn_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  bases_spawned INTEGER NOT NULL,
  trigger_reason TEXT NOT NULL, -- 'startup', 'dynamic_scaling', 'milestone'
  metrics_snapshot JSONB -- Store metrics at time of spawn
);

-- Track world metrics over time
CREATE TABLE IF NOT EXISTS world_metrics (
  id SERIAL PRIMARY KEY,
  world_id INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_bases INTEGER,
  claimed_bases INTEGER,
  unclaimed_bases INTEGER,
  player_count INTEGER,
  claim_rate_per_hour FLOAT,
  claim_velocity FLOAT -- Rate of change of claim rate
);

-- Update buildings table to include base specialization if not exists
ALTER TABLE buildings 
ADD COLUMN IF NOT EXISTS base_specialization TEXT DEFAULT 'ground' CHECK (base_specialization IN ('ground', 'heli', 'air', 'naval', 'train'));

-- Add world references
ALTER TABLE buildings 
ADD COLUMN IF NOT EXISTS world_id INTEGER REFERENCES worlds(id) ON DELETE CASCADE;

-- Update game_worlds to reference new worlds table
ALTER TABLE game_worlds 
ADD COLUMN IF NOT EXISTS world_id INTEGER REFERENCES worlds(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_worlds_status ON worlds(status);
CREATE INDEX IF NOT EXISTS idx_worlds_world_number ON worlds(world_number);
CREATE INDEX IF NOT EXISTS idx_buildings_world_id ON buildings(world_id);
CREATE INDEX IF NOT EXISTS idx_world_rivers_world_id ON world_rivers(world_id);
CREATE INDEX IF NOT EXISTS idx_world_railroads_world_id ON world_railroads(world_id);
CREATE INDEX IF NOT EXISTS idx_world_base_zones_world_id ON world_base_zones(world_id);
CREATE INDEX IF NOT EXISTS idx_base_spawn_events_world_id ON base_spawn_events(world_id);
CREATE INDEX IF NOT EXISTS idx_world_metrics_world_id ON world_metrics(world_id);
