-- Create function to allow users to create new teams
CREATE OR REPLACE FUNCTION public.create_new_team(
  user_uuid uuid,
  team_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_team_id uuid;
BEGIN
  -- Validate team name
  IF team_name IS NULL OR trim(team_name) = '' THEN
    RAISE EXCEPTION 'Team name cannot be empty';
  END IF;
  
  -- Create new team
  INSERT INTO teams (name)
  VALUES (trim(team_name))
  RETURNING id INTO new_team_id;
  
  -- Add creator as admin
  INSERT INTO team_members (user_id, team_id, role)
  VALUES (user_uuid, new_team_id, 'admin');
  
  RETURN new_team_id;
END;
$$;