-- Fix the atomic field update function to actually update the items array
CREATE OR REPLACE FUNCTION update_rundown_field_atomic(
  rundown_uuid uuid,
  item_id text,
  field_name text,
  field_value jsonb,
  user_uuid uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_version integer;
  update_key text;
  result jsonb;
  updated_items jsonb;
BEGIN
  -- Create update key for this field
  update_key := item_id || '.' || field_name;
  
  -- Get current doc version
  SELECT doc_version INTO current_version
  FROM rundowns
  WHERE id = rundown_uuid;
  
  -- Update the specific field in the items array
  WITH updated_items_cte AS (
    SELECT jsonb_agg(
      CASE 
        WHEN item->>'id' = item_id THEN 
          jsonb_set(item, ARRAY[field_name], field_value)
        ELSE item
      END
    ) as new_items
    FROM rundowns r, jsonb_array_elements(r.items) as item
    WHERE r.id = rundown_uuid
  )
  UPDATE rundowns
  SET 
    items = (SELECT new_items FROM updated_items_cte),
    item_field_updates = jsonb_set(
      COALESCE(item_field_updates, '{}'::jsonb),
      ARRAY[update_key],
      jsonb_build_object(
        'value', field_value,
        'updated_at', to_jsonb(now()),
        'updated_by', to_jsonb(user_uuid),
        'version', current_version + 1
      )
    ),
    doc_version = current_version + 1,
    updated_at = now(),
    last_updated_by = user_uuid
  WHERE id = rundown_uuid;
  
  -- Return the update info
  SELECT jsonb_build_object(
    'success', true,
    'version', current_version + 1,
    'field_key', update_key,
    'updated_at', now()
  ) INTO result;
  
  RETURN result;
END;
$$;