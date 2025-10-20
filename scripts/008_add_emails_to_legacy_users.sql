-- Add emails to legacy users who don't have one
-- This handles users created before the email system was implemented

UPDATE users 
SET email = username || '@legacy.local'
WHERE email IS NULL OR email = '';

-- Optionally, you can set a specific email for the owner account
UPDATE users 
SET email = 'owner@game.local'
WHERE username = 'owner' AND (email IS NULL OR email = '' OR email LIKE '%@legacy.local');
