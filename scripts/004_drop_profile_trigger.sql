-- Drop the problematic trigger that tries to insert into non-existent profiles table
-- The app uses the users table instead, which is populated by /api/auth/register

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
