-- Create a function that automatically creates a user profile when an auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into users table with data from auth metadata
  INSERT INTO public.users (
    auth_user_id,
    username,
    email,
    password,
    ip_address,
    role,
    points,
    is_banned,
    is_muted,
    block_alliance_invites
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NULL),
    NEW.email,
    -- Store password from metadata (note: this will be the plain text password passed during signup)
    COALESCE(NEW.raw_user_meta_data->>'password', NULL),
    COALESCE(NEW.raw_user_meta_data->>'ip_address', NULL),
    'player',
    0,
    false,
    false,
    false
  )
  ON CONFLICT (auth_user_id) DO NOTHING;

  -- Track registration IP in user_ip_history
  -- We need to get the user_id first
  IF NEW.raw_user_meta_data->>'ip_address' IS NOT NULL THEN
    INSERT INTO public.user_ip_history (
      user_id,
      ip_address,
      access_count
    )
    SELECT 
      u.id,
      NEW.raw_user_meta_data->>'ip_address',
      1
    FROM public.users u
    WHERE u.auth_user_id = NEW.id
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger that fires after a new user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
