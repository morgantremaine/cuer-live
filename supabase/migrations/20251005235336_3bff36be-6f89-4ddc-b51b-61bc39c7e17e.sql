-- Cleanup function for orphaned layouts
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_layouts(target_team_id uuid, new_owner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  layouts_updated integer;
BEGIN
  -- Verify the new owner is an admin of the team
  IF NOT is_team_admin_simple(new_owner_id, target_team_id) THEN
    RETURN jsonb_build_object('error', 'Only team admins can claim orphaned layouts');
  END IF;
  
  -- Transfer layouts where the owner is no longer a team member
  UPDATE column_layouts
  SET user_id = new_owner_id,
      updated_at = now()
  WHERE team_id = target_team_id
    AND user_id NOT IN (
      SELECT user_id FROM team_members WHERE team_id = target_team_id
    );
  
  GET DIAGNOSTICS layouts_updated = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'layouts_claimed', layouts_updated
  );
END;
$$;

-- Cleanup function for orphaned custom columns
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_custom_columns(target_team_id uuid, new_owner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  columns_updated integer;
BEGIN
  -- Verify the new owner is an admin of the team
  IF NOT is_team_admin_simple(new_owner_id, target_team_id) THEN
    RETURN jsonb_build_object('error', 'Only team admins can claim orphaned custom columns');
  END IF;
  
  -- Transfer custom columns where the creator is no longer a team member
  UPDATE team_custom_columns
  SET created_by = new_owner_id,
      updated_at = now()
  WHERE team_id = target_team_id
    AND created_by NOT IN (
      SELECT user_id FROM team_members WHERE team_id = target_team_id
    );
  
  GET DIAGNOSTICS columns_updated = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'columns_claimed', columns_updated
  );
END;
$$;