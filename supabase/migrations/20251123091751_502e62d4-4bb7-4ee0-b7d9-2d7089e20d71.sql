-- Update handle_new_user to store Google OAuth profile pictures
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
DECLARE
  user_team_id uuid;
BEGIN
  -- Create profile with Google avatar if available
  INSERT INTO public.profiles (id, email, full_name, profile_picture_url)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(
      NEW.raw_user_meta_data ->> 'avatar_url',
      NEW.raw_user_meta_data ->> 'picture'
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    profile_picture_url = COALESCE(
      EXCLUDED.profile_picture_url, 
      profiles.profile_picture_url
    );
  
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
  user_team_id := get_or_create_user_team(NEW.id);
  PERFORM create_demo_content_for_user(NEW.id, user_team_id);
  
  RETURN NEW;
END;
$$;

-- Backfill profile pictures for existing Google OAuth users
UPDATE profiles p
SET profile_picture_url = COALESCE(
  au.raw_user_meta_data ->> 'avatar_url',
  au.raw_user_meta_data ->> 'picture'
)
FROM auth.users au
WHERE p.id = au.id
  AND p.profile_picture_url IS NULL
  AND (
    au.raw_user_meta_data ->> 'avatar_url' IS NOT NULL 
    OR au.raw_user_meta_data ->> 'picture' IS NOT NULL
  );