-- Create function for members to leave a team
CREATE OR REPLACE FUNCTION public.leave_team_as_member(
  team_id_to_leave uuid,
  user_id_leaving uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_role text;
  admin_user_id uuid;
  rundown_count integer;
  blueprint_count integer;
  member_email text;
  member_name text;
BEGIN
  -- Get member details and role
  SELECT tm.role, p.email, p.full_name
  INTO member_role, member_email, member_name
  FROM team_members tm
  JOIN profiles p ON p.id = tm.user_id
  WHERE tm.user_id = user_id_leaving 
    AND tm.team_id = team_id_to_leave;
  
  IF member_role IS NULL THEN
    RETURN jsonb_build_object('error', 'You are not a member of this team');
  END IF;
  
  -- Prevent admins from using this function (they should transfer admin role first)
  IF member_role = 'admin' THEN
    RETURN jsonb_build_object('error', 'Admins cannot leave the team. Please transfer admin role first.');
  END IF;
  
  -- Find a team admin to transfer data to
  SELECT user_id INTO admin_user_id
  FROM team_members
  WHERE team_id = team_id_to_leave 
    AND role = 'admin'
  LIMIT 1;
  
  IF admin_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No admin found to transfer data to');
  END IF;
  
  -- Count rundowns to be transferred
  SELECT COUNT(*) INTO rundown_count
  FROM rundowns
  WHERE user_id = user_id_leaving AND team_id = team_id_to_leave;
  
  -- Count blueprints to be transferred
  SELECT COUNT(*) INTO blueprint_count
  FROM blueprints
  WHERE user_id = user_id_leaving AND team_id = team_id_to_leave;
  
  -- Transfer rundowns to admin
  UPDATE rundowns
  SET user_id = admin_user_id,
      updated_at = now()
  WHERE user_id = user_id_leaving AND team_id = team_id_to_leave;
  
  -- Transfer blueprints to admin
  UPDATE blueprints
  SET user_id = admin_user_id,
      updated_at = now()
  WHERE user_id = user_id_leaving AND team_id = team_id_to_leave;
  
  -- Remove from team (this will NOT delete their account or personal team)
  DELETE FROM team_members 
  WHERE user_id = user_id_leaving AND team_id = team_id_to_leave;
  
  RETURN jsonb_build_object(
    'success', true,
    'rundowns_transferred', rundown_count,
    'blueprints_transferred', blueprint_count,
    'member_email', member_email,
    'member_name', member_name
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in leave_team_as_member: %', SQLERRM;
    RETURN jsonb_build_object('error', 'Failed to leave team: ' || SQLERRM);
END;
$$;