-- Update the handle_new_user function with better error handling and logging
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_team_id uuid;
  demo_folder_id uuid;
  source_rundown RECORD;
  new_rundown_id uuid;
BEGIN
  RAISE LOG 'handle_new_user: Starting for user %', NEW.id;
  
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
  
  RAISE LOG 'handle_new_user: Profile created for user %', NEW.id;
  
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
  ON CONFLICT (email) DO NOTHING; -- Don't overwrite existing subscriptions
  
  RAISE LOG 'handle_new_user: Subscription created for user %', NEW.id;
  
  -- Get or create user team
  user_team_id := get_or_create_user_team(NEW.id);
  RAISE LOG 'handle_new_user: Team ID % for user %', user_team_id, NEW.id;
  
  -- Create DEMO folder
  INSERT INTO public.rundown_folders (
    team_id,
    name,
    color,
    position,
    created_by
  ) VALUES (
    user_team_id,
    'DEMO',
    '#8B5CF6',
    0,
    NEW.id
  )
  RETURNING id INTO demo_folder_id;
  
  RAISE LOG 'handle_new_user: DEMO folder created with ID % for user %', demo_folder_id, NEW.id;
  
  -- Get the source demo rundown data
  SELECT title, items, columns, timezone, start_time, icon
  INTO source_rundown
  FROM public.rundowns 
  WHERE id = 'fd7d054b-1eff-4b7d-85f8-e9bded255cca'
  LIMIT 1;
  
  -- Create demo rundown if source exists
  IF source_rundown IS NOT NULL THEN
    RAISE LOG 'handle_new_user: Source rundown found, creating demo rundown for user %', NEW.id;
    
    -- Generate new ID for the demo rundown
    new_rundown_id := gen_random_uuid();
    
    INSERT INTO public.rundowns (
      id,
      user_id,
      team_id,
      folder_id,
      title,
      items,
      columns,
      timezone,
      start_time,
      icon,
      is_demo,
      visibility,
      archived,
      created_at,
      updated_at
    ) VALUES (
      new_rundown_id,
      NEW.id,
      user_team_id,
      demo_folder_id,
      'Demo Rundown - Esports Broadcast',
      COALESCE(source_rundown.items, '[]'::jsonb),
      source_rundown.columns,
      source_rundown.timezone,
      source_rundown.start_time,
      source_rundown.icon,
      true, -- This is a demo rundown
      'private',
      false, -- Not archived
      now(),
      now()
    );
    
    RAISE LOG 'handle_new_user: Demo rundown created with ID % for user %', new_rundown_id, NEW.id;
  ELSE
    RAISE LOG 'handle_new_user: Source demo rundown not found for user %', NEW.id;
  END IF;
  
  RAISE LOG 'handle_new_user: Completed successfully for user %', NEW.id;
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: Error for user %: %', NEW.id, SQLERRM;
    -- Don't fail the entire user creation, just log the error
    RETURN NEW;
END;
$function$;