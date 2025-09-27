-- Add new columns for per-cell save system (alongside existing columns)
-- This allows dual-write approach where old system continues to work

ALTER TABLE rundowns 
ADD COLUMN IF NOT EXISTS item_field_updates jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS per_cell_save_enabled boolean DEFAULT false;

-- Create function for atomic field updates
CREATE OR REPLACE FUNCTION public.update_rundown_field_atomic(
  rundown_uuid uuid,
  item_id text,
  field_name text,
  field_value jsonb,
  user_uuid uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_version integer;
  update_key text;
  result jsonb;
BEGIN
  -- Create update key for this field
  update_key := item_id || '.' || field_name;
  
  -- Get current doc version
  SELECT doc_version INTO current_version
  FROM rundowns
  WHERE id = rundown_uuid;
  
  -- Perform atomic update of both field updates and doc version
  UPDATE rundowns
  SET 
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

-- Create function to check if user should use per-cell save
CREATE OR REPLACE FUNCTION public.should_use_per_cell_save(user_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT user_email IN ('morgan@cuer.live', 'morgantremaine@me.com');
$$;

-- Create function to get merged rundown data (combines old items with field updates)
CREATE OR REPLACE FUNCTION public.get_rundown_with_field_updates(rundown_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rundown_data jsonb;
  field_updates jsonb;
  merged_items jsonb;
  item jsonb;
  field_key text;
  field_data jsonb;
  item_id text;
  field_name text;
BEGIN
  -- Get rundown data
  SELECT to_jsonb(r.*) INTO rundown_data
  FROM rundowns r
  WHERE r.id = rundown_uuid;
  
  IF rundown_data IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- If per-cell save not enabled, return original data
  IF NOT (rundown_data->>'per_cell_save_enabled')::boolean THEN
    RETURN rundown_data;
  END IF;
  
  -- Get field updates
  field_updates := rundown_data->'item_field_updates';
  merged_items := rundown_data->'items';
  
  -- Apply field updates to items
  FOR field_key, field_data IN SELECT * FROM jsonb_each(field_updates)
  LOOP
    -- Parse field key (format: "item_id.field_name")
    SELECT split_part(field_key, '.', 1) INTO item_id;
    SELECT split_part(field_key, '.', 2) INTO field_name;
    
    -- Update the specific field in the items array
    merged_items := jsonb_set(
      merged_items,
      ARRAY[
        (
          SELECT (idx-1)::text 
          FROM jsonb_array_elements(merged_items) WITH ORDINALITY AS t(item, idx)
          WHERE item->>'id' = item_id
          LIMIT 1
        ),
        field_name
      ],
      field_data->'value'
    );
  END LOOP;
  
  -- Return rundown data with merged items
  RETURN jsonb_set(rundown_data, '{items}', merged_items);
END;
$$;