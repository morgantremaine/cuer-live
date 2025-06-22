
-- Create function to transfer rundowns to admin and delete user completely
CREATE OR REPLACE FUNCTION public.remove_team_member_with_transfer(
  member_id uuid,
  admin_id uuid,
  team_id_param uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  member_user_id uuid;
  rundown_count integer;
  blueprint_count integer;
  result jsonb;
BEGIN
  -- Get the user_id of the member being removed
  SELECT user_id INTO member_user_id
  FROM team_members
  WHERE id = member_id AND team_id = team_id_param;
  
  IF member_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Team member not found');
  END IF;
  
  -- Prevent removing the last admin
  IF EXISTS (
    SELECT 1 FROM team_members 
    WHERE user_id = member_user_id 
    AND team_id = team_id_param 
    AND role = 'admin'
  ) THEN
    -- Check if this is the only admin
    IF (
      SELECT COUNT(*) FROM team_members 
      WHERE team_id = team_id_param 
      AND role = 'admin'
    ) = 1 THEN
      RETURN jsonb_build_object('error', 'Cannot remove the last admin from the team');
    END IF;
  END IF;
  
  -- Count rundowns that will be transferred
  SELECT COUNT(*) INTO rundown_count
  FROM rundowns
  WHERE user_id = member_user_id AND team_id = team_id_param;
  
  -- Count blueprints that will be transferred
  SELECT COUNT(*) INTO blueprint_count
  FROM blueprints
  WHERE user_id = member_user_id AND team_id = team_id_param;
  
  -- Transfer rundowns to admin
  UPDATE rundowns
  SET user_id = admin_id,
      updated_at = now()
  WHERE user_id = member_user_id AND team_id = team_id_param;
  
  -- Transfer blueprints to admin
  UPDATE blueprints
  SET user_id = admin_id,
      updated_at = now()
  WHERE user_id = member_user_id AND team_id = team_id_param;
  
  -- Remove from team (this will cascade to other related records)
  DELETE FROM team_members WHERE id = member_id;
  
  -- Delete user profile and mark invitations as expired
  PERFORM delete_user_completely(member_user_id);
  
  -- Return summary of what was transferred
  result := jsonb_build_object(
    'success', true,
    'rundowns_transferred', rundown_count,
    'blueprints_transferred', blueprint_count,
    'user_deleted', true
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and return it
    RAISE LOG 'Error in remove_team_member_with_transfer: %', SQLERRM;
    RETURN jsonb_build_object('error', 'Failed to remove team member: ' || SQLERRM);
END;
$function$;

-- Create function to get transfer preview (what will be transferred)
CREATE OR REPLACE FUNCTION public.get_member_transfer_preview(
  member_id uuid,
  team_id_param uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  member_user_id uuid;
  rundown_count integer;
  blueprint_count integer;
  member_email text;
  member_name text;
BEGIN
  -- Get member details
  SELECT tm.user_id, p.email, p.full_name
  INTO member_user_id, member_email, member_name
  FROM team_members tm
  JOIN profiles p ON p.id = tm.user_id
  WHERE tm.id = member_id AND tm.team_id = team_id_param;
  
  IF member_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Team member not found');
  END IF;
  
  -- Count rundowns
  SELECT COUNT(*) INTO rundown_count
  FROM rundowns
  WHERE user_id = member_user_id AND team_id = team_id_param;
  
  -- Count blueprints
  SELECT COUNT(*) INTO blueprint_count
  FROM blueprints
  WHERE user_id = member_user_id AND team_id = team_id_param;
  
  RETURN jsonb_build_object(
    'member_email', member_email,
    'member_name', member_name,
    'rundown_count', rundown_count,
    'blueprint_count', blueprint_count,
    'will_delete_account', true
  );
END;
$function$;
