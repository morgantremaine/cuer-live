-- Fix the team invite system by preventing automatic team creation for invited users
-- Update the handle_new_user function to check for pending invitations

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_team_id uuid;
  has_pending_invitation boolean := false;
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
  
  -- Check if user has a pending team invitation
  SELECT EXISTS (
    SELECT 1 FROM team_invitations 
    WHERE email = NEW.email 
    AND accepted = false 
    AND expires_at > now()
  ) INTO has_pending_invitation;
  
  -- Only create a personal team if the user doesn't have a pending invitation
  IF NOT has_pending_invitation THEN
    -- Get or create user team
    user_team_id := get_or_create_user_team(NEW.id);
    
    -- Create demo content for the new user
    PERFORM create_demo_content_for_user(NEW.id, user_team_id);
  END IF;
  
  RETURN NEW;
END;
$$;