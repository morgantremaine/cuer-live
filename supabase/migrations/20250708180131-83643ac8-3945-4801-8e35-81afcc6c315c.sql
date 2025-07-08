-- Fix the get_shared_layout_for_public_rundown function to properly handle null layout_id
CREATE OR REPLACE FUNCTION public.get_shared_layout_for_public_rundown(rundown_uuid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  layout_data jsonb;
BEGIN
  -- Check if the rundown exists and has a shared layout configured
  -- The existence of a shared_rundown_layouts record indicates permission to share
  IF NOT EXISTS (
    SELECT 1 
    FROM rundowns r
    JOIN shared_rundown_layouts srl ON r.id = srl.rundown_id
    WHERE r.id = rundown_uuid
  ) THEN
    RETURN NULL;
  END IF;
  
  -- Get the shared layout configuration for this rundown
  SELECT jsonb_build_object(
    'layout_id', srl.layout_id,
    'layout_name', CASE 
      WHEN srl.layout_id IS NULL THEN 'Default Layout'
      ELSE COALESCE(cl.name, 'Custom Layout')
    END,
    'columns', CASE 
      WHEN srl.layout_id IS NULL THEN r.columns
      ELSE COALESCE(cl.columns, r.columns, '[]'::jsonb)
    END
  ) INTO layout_data
  FROM rundowns r
  LEFT JOIN shared_rundown_layouts srl ON r.id = srl.rundown_id
  LEFT JOIN column_layouts cl ON srl.layout_id = cl.id
  WHERE r.id = rundown_uuid;
  
  RETURN layout_data;
END;
$function$