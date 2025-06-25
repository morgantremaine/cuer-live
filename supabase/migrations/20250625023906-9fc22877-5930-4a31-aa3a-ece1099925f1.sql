
-- Fix the RLS function to treat NULL visibility as accessible for shared rundowns
CREATE OR REPLACE FUNCTION public.get_shared_layout_for_public_rundown(rundown_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
DECLARE
  layout_data jsonb;
  rundown_visibility text;
BEGIN
  -- First, check if the rundown exists and get its visibility
  SELECT visibility INTO rundown_visibility
  FROM rundowns
  WHERE id = rundown_uuid;
  
  -- If rundown doesn't exist, return null
  IF rundown_visibility IS NULL AND NOT EXISTS (SELECT 1 FROM rundowns WHERE id = rundown_uuid) THEN
    RETURN NULL;
  END IF;
  
  -- Only block explicitly private rundowns (treat NULL and 'public' as accessible)
  IF rundown_visibility = 'private' THEN
    RETURN NULL;
  END IF;
  
  -- Get the shared layout configuration for this rundown
  SELECT jsonb_build_object(
    'layout_id', srl.layout_id,
    'layout_name', COALESCE(cl.name, 'Custom Layout'),
    'columns', COALESCE(cl.columns, r.columns, '[]'::jsonb)
  ) INTO layout_data
  FROM rundowns r
  LEFT JOIN shared_rundown_layouts srl ON r.id = srl.rundown_id
  LEFT JOIN column_layouts cl ON srl.layout_id = cl.id
  WHERE r.id = rundown_uuid;
  
  RETURN layout_data;
END;
$$;
