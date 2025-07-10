CREATE OR REPLACE FUNCTION public.cleanup_deleted_team_column(team_uuid uuid, column_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Remove the specified column from all user column preferences for rundowns belonging to this team
  UPDATE user_column_preferences 
  SET column_layout = (
    SELECT jsonb_agg(column_obj)
    FROM jsonb_array_elements(column_layout) AS column_obj
    WHERE column_obj->>'key' != column_key
  ),
  updated_at = now()
  WHERE rundown_id IN (
    SELECT id FROM rundowns WHERE team_id = team_uuid
  )
  AND column_layout IS NOT NULL
  AND jsonb_typeof(column_layout) = 'array';
END;
$function$