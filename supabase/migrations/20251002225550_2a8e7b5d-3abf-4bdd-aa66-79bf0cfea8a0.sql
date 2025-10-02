-- Always create personal team for new users, even when joining via invitation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_team_id uuid;
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
    false,
    'Free',
    1,
    false,
    now(),
    now()
  )
  ON CONFLICT (email) DO NOTHING;
  
  -- ALWAYS create a personal team for new users
  -- (Even if they have a pending invitation, they still get their own team)
  user_team_id := get_or_create_user_team(NEW.id);
  PERFORM create_demo_content_for_user(NEW.id, user_team_id);
  
  RETURN NEW;
END;
$$;