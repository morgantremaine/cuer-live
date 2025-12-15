-- Create a function to surgically update just the sortOrder field of a specific item
-- This avoids read-modify-write race conditions for concurrent reordering
CREATE OR REPLACE FUNCTION public.update_item_sort_order(
  p_rundown_id UUID,
  p_item_id TEXT,
  p_sort_order TEXT,
  p_user_id UUID DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  item_index INTEGER;
  result jsonb;
BEGIN
  -- Find the index of the item in the items array
  SELECT (ordinality - 1) INTO item_index
  FROM rundowns, jsonb_array_elements(items) WITH ORDINALITY AS elem
  WHERE id = p_rundown_id AND elem->>'id' = p_item_id;
  
  IF item_index IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;
  
  -- Update just the sortOrder field of that specific item atomically
  UPDATE rundowns
  SET items = jsonb_set(
    items,
    ARRAY[item_index::text, 'sortOrder'],
    to_jsonb(p_sort_order)
  ),
  updated_at = NOW(),
  doc_version = COALESCE(doc_version, 0) + 1,
  last_updated_by = COALESCE(p_user_id, last_updated_by)
  WHERE id = p_rundown_id;
  
  RETURN jsonb_build_object('success', true, 'itemIndex', item_index);
END;
$$;