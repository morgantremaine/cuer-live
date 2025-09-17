-- Revert all recent changes to clean up the database

-- 1. Remove the demo rundowns we created
DELETE FROM public.rundowns 
WHERE user_id = 'cde54387-6ed6-4f3c-a359-78efdc71d1d9' 
AND is_demo = true;

-- 2. Remove the team membership we created
DELETE FROM public.team_members 
WHERE user_id = 'cde54387-6ed6-4f3c-a359-78efdc71d1d9' 
AND team_id = 'd612e739-989c-4856-84c0-9185d8553107';

-- 3. Revert the handle_new_user function to a simpler version
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  
  -- Create Free tier subscription for new users
  INSERT INTO public.subscribers (
    user_id,
    email,
    subscribed,
    subscription_tier,
    max_team_members,
    grandfathered,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    false,  -- Free tier is not a paid subscription
    'Free',
    1,      -- Free tier allows 1 team member
    false,
    now(),
    now()
  )
  ON CONFLICT (email) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- 4. Remove the is_demo column from rundowns table
ALTER TABLE public.rundowns DROP COLUMN IF EXISTS is_demo;