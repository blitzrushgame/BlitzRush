-- Update the default max_members for new alliances to 30
ALTER TABLE alliances 
ALTER COLUMN max_members SET DEFAULT 30;

-- Update existing alliances to have max_members = 30
UPDATE alliances 
SET max_members = 30 
WHERE max_members = 100;
