-- Create function to update column layouts when team custom columns are renamed
CREATE OR REPLACE FUNCTION public.update_column_layouts_on_team_column_rename(
  team_uuid uuid, 
  old_column_key text, 
  new_column_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update all column layouts for rundowns belonging to this team
  UPDATE column_layouts 
  SET columns = (
    SELECT jsonb_agg(
      CASE 
        WHEN column_obj->>'key' = old_column_key 
        THEN jsonb_set(column_obj, '{name}', to_jsonb(new_column_name))
        ELSE column_obj
      END
    )
    FROM jsonb_array_elements(columns) AS column_obj
  ),
  updated_at = now()
  WHERE team_id = team_uuid
    AND columns IS NOT NULL
    AND jsonb_typeof(columns) = 'array'
    AND EXISTS (
      SELECT 1 
      FROM jsonb_array_elements(columns) AS column_obj
      WHERE column_obj->>'key' = old_column_key
    );
    
  -- Also update any user column preferences that reference this team's rundowns
  UPDATE user_column_preferences 
  SET column_layout = (
    SELECT jsonb_agg(
      CASE 
        WHEN column_obj->>'key' = old_column_key 
        THEN jsonb_set(column_obj, '{name}', to_jsonb(new_column_name))
        ELSE column_obj
      END
    )
    FROM jsonb_array_elements(column_layout) AS column_obj
  ),
  updated_at = now()
  WHERE rundown_id IN (
    SELECT id FROM rundowns WHERE team_id = team_uuid
  )
  AND column_layout IS NOT NULL
  AND jsonb_typeof(column_layout) = 'array'
  AND EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(column_layout) AS column_obj
    WHERE column_obj->>'key' = old_column_key
  );
END;
$function$

-- Create trigger function to automatically call the update function when team columns are renamed
CREATE OR REPLACE FUNCTION public.handle_team_column_rename()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Only proceed if the column_name actually changed
  IF OLD.column_name != NEW.column_name THEN
    -- Update all related column layouts and user preferences
    PERFORM update_column_layouts_on_team_column_rename(
      NEW.team_id,
      NEW.column_key,
      NEW.column_name
    );
  END IF;
  
  RETURN NEW;
END;
$function$

-- Create the trigger on team_custom_columns table
DROP TRIGGER IF EXISTS team_custom_columns_rename_trigger ON team_custom_columns;
CREATE TRIGGER team_custom_columns_rename_trigger
  AFTER UPDATE ON team_custom_columns
  FOR EACH ROW
  EXECUTE FUNCTION handle_team_column_rename();