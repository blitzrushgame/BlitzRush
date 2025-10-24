-- Reset home base for current user
-- This will delete the existing home base so a new one can be created on next login

DO $$
DECLARE
    v_user_id INTEGER;
BEGIN
    -- Find the user (adjust the username if needed)
    SELECT id INTO v_user_id FROM users WHERE username ILIKE '%' LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        -- Delete the home base
        DELETE FROM buildings 
        WHERE owner_id = v_user_id 
        AND is_home_base = true;
        
        RAISE NOTICE 'Home base deleted for user ID: %', v_user_id;
    ELSE
        RAISE NOTICE 'No user found';
    END IF;
END $$;
