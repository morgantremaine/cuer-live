-- Create a temporary function to add demo rundowns for existing users
CREATE OR REPLACE FUNCTION public.create_demo_rundown_for_user(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_team_id uuid;
  demo_folder_id uuid;
  source_rundown RECORD;
  new_rundown_id uuid;
  result jsonb;
BEGIN
  -- Get user's team ID
  SELECT team_id INTO user_team_id
  FROM team_members 
  WHERE user_id = target_user_id 
  LIMIT 1;
  
  IF user_team_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User team not found');
  END IF;
  
  -- Get DEMO folder ID
  SELECT id INTO demo_folder_id
  FROM rundown_folders 
  WHERE team_id = user_team_id AND name = 'DEMO'
  LIMIT 1;
  
  IF demo_folder_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'DEMO folder not found');
  END IF;
  
  -- Check if demo rundown already exists
  IF EXISTS (
    SELECT 1 FROM rundowns 
    WHERE user_id = target_user_id AND is_demo = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Demo rundown already exists');
  END IF;
  
  -- Get the source demo rundown data
  SELECT title, items, columns, timezone, start_time, icon
  INTO source_rundown
  FROM public.rundowns 
  WHERE id = 'fd7d054b-1eff-4b7d-85f8-e9bded255cca'
  LIMIT 1;
  
  IF source_rundown IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source demo rundown not found');
  END IF;
  
  -- Generate new ID for the demo rundown
  new_rundown_id := gen_random_uuid();
  
  -- Create the demo rundown
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
    target_user_id,
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
  
  RETURN jsonb_build_object(
    'success', true, 
    'rundown_id', new_rundown_id,
    'message', 'Demo rundown created successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', SQLERRM
    );
END;
$function$;

-- Create the demo rundown for the current user
SELECT create_demo_rundown_for_user('cde54387-6ed6-4f3c-a359-78efdc71d1d9');

-- Clean up the temporary function
DROP FUNCTION public.create_demo_rundown_for_user(uuid);