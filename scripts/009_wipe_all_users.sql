-- Wipe all existing users to start fresh
-- This will delete all user accounts and related data

-- Delete all users (cascading deletes will handle related records)
DELETE FROM users;

-- Reset any sequences if needed
-- ALTER SEQUENCE users_id_seq RESTART WITH 1;

SELECT 'All users have been deleted. You can now test registration and login from scratch.' as message;
