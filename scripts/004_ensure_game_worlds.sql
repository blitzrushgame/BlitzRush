-- Removed sequence update that doesn't exist
-- Ensure game_worlds table has the 10 worlds
-- This script is idempotent and safe to run multiple times

DO $$
BEGIN
  -- Only insert if worlds don't exist
  IF NOT EXISTS (SELECT 1 FROM game_worlds WHERE id = 1) THEN
    INSERT INTO game_worlds (id, name, description) VALUES
      (1, '1', 'Map 1'),
      (2, '2', 'Map 2'),
      (3, '3', 'Map 3'),
      (4, '4', 'Map 4'),
      (5, '5', 'Map 5'),
      (6, '6', 'Map 6'),
      (7, '7', 'Map 7'),
      (8, '8', 'Map 8'),
      (9, '9', 'Map 9'),
      (10, '10', 'Map 10')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
