-- Update the remove_team_member_with_transfer function to also transfer column layouts and custom columns
CREATE OR REPLACE FUNCTION public.remove_team_member_with_transfer(member_id uuid, admin_id uuid, team_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  member_user_id uuid;
  rundown_count integer;
  blueprint_count integer;
  layout_count integer;
  custom_column_count integer;
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
  
  -- Count column layouts that will be transferred
  SELECT COUNT(*) INTO layout_count
  FROM column_layouts
  WHERE user_id = member_user_id AND team_id = team_id_param;
  
  -- Count custom columns that will be transferred
  SELECT COUNT(*) INTO custom_column_count
  FROM team_custom_columns
  WHERE created_by = member_user_id AND team_id = team_id_param;
  
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
  
  -- Transfer column layouts to admin
  UPDATE column_layouts
  SET user_id = admin_id,
      updated_at = now()
  WHERE user_id = member_user_id AND team_id = team_id_param;
  
  -- Transfer custom column ownership to admin
  UPDATE team_custom_columns
  SET created_by = admin_id,
      updated_at = now()
  WHERE created_by = member_user_id AND team_id = team_id_param;
  
  -- Remove from team (this will cascade to other related records)
  DELETE FROM team_members WHERE id = member_id;
  
  -- Clean up public schema data
  DELETE FROM profiles WHERE id = member_user_id;
  
  -- Mark any pending invitations for this email as expired
  UPDATE team_invitations 
  SET expires_at = now() - interval '1 day'
  WHERE email = (SELECT email FROM auth.users WHERE id = member_user_id)
  AND accepted = false;
  
  -- Return summary of what was transferred, including user_id_to_delete
  result := jsonb_build_object(
    'success', true,
    'rundowns_transferred', rundown_count,
    'blueprints_transferred', blueprint_count,
    'layouts_transferred', layout_count,
    'custom_columns_transferred', custom_column_count,
    'user_deleted', true,
    'user_id_to_delete', member_user_id
  );
  
  RAISE LOG 'Transfer result: %', result;
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and return it
    RAISE LOG 'Error in remove_team_member_with_transfer: %', SQLERRM;
    RETURN jsonb_build_object('error', 'Failed to remove team member: ' || SQLERRM);
END;
$function$;