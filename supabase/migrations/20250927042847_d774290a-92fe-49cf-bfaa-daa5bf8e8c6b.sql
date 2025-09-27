-- Create the missing atomic field update function for per-cell saves
CREATE OR REPLACE FUNCTION public.update_rundown_field_atomic(
  rundown_uuid uuid,
  item_id text,
  field_name text,
  field_value jsonb,
  user_uuid uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_items jsonb;
  updated_items jsonb;
  current_version integer;
  new_version integer;
  field_key text;
  current_field_updates jsonb;
BEGIN
  -- Construct field key for tracking
  field_key := item_id || '.' || field_name;
  
  -- Get current rundown data with row locking for atomicity
  SELECT items, doc_version, COALESCE(item_field_updates, '{}'::jsonb)
  INTO current_items, current_version, current_field_updates
  FROM rundowns 
  WHERE id = rundown_uuid
  FOR UPDATE;
  
  -- Check if rundown exists
  IF current_items IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Rundown not found',
      'version', null
    );
  END IF;
  
  -- Update the specific field in the items array
  updated_items := (
    SELECT jsonb_agg(
      CASE 
        WHEN item->>'id' = item_id 
        THEN jsonb_set(item, ARRAY[field_name], field_value)
        ELSE item
      END
    )
    FROM jsonb_array_elements(current_items) AS item
  );
  
  -- Calculate new version
  new_version := current_version + 1;
  
  -- Update field-level tracking
  current_field_updates := jsonb_set(
    current_field_updates,
    ARRAY[field_key],
    jsonb_build_object(
      'version', new_version,
      'updated_by', user_uuid,
      'updated_at', extract(epoch from now())
    )
  );
  
  -- Update the rundown with new items and field tracking
  UPDATE rundowns 
  SET 
    items = updated_items,
    doc_version = new_version,
    item_field_updates = current_field_updates,
    updated_at = now(),
    last_updated_by = user_uuid
  WHERE id = rundown_uuid;
  
  -- Return success with version info
  RETURN jsonb_build_object(
    'success', true,
    'version', new_version,
    'field_key', field_key,
    'updated_at', extract(epoch from now())
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error details for debugging
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'version', null
    );
END;
$function$;