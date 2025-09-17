-- Add is_demo column to rundowns table
ALTER TABLE public.rundowns 
ADD COLUMN is_demo boolean NOT NULL DEFAULT false;

-- Create index for better performance when filtering demo rundowns
CREATE INDEX idx_rundowns_is_demo ON public.rundowns(is_demo);

-- Update the handle_new_user function to create demo rundown
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
  ON CONFLICT (email) DO NOTHING; -- Don't overwrite existing subscriptions
  
  -- Get or create user team
  user_team_id := get_or_create_user_team(NEW.id);
  
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
  
  -- Get the source demo rundown data
  SELECT title, items, columns, timezone, start_time, icon
  INTO source_rundown
  FROM public.rundowns 
  WHERE id = 'fd7d054b-1eff-4b7d-85f8-e9bded255cca'
  LIMIT 1;
  
  -- Create demo rundown if source exists
  IF source_rundown IS NOT NULL THEN
    INSERT INTO public.rundowns (
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
      created_at,
      updated_at
    ) VALUES (
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
      now(),
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$function$;