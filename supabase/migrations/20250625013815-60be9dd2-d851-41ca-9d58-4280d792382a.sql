
-- Create a function that allows anonymous users to get layout data for public rundowns
CREATE OR REPLACE FUNCTION public.get_public_layout_for_rundown(
  rundown_uuid uuid,
  layout_uuid uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  layout_data jsonb;
BEGIN
  -- Check if the rundown is public and has the specified layout shared
  IF NOT EXISTS (
    SELECT 1 
    FROM rundowns r
    JOIN shared_rundown_layouts srl ON r.id = srl.rundown_id
    WHERE r.id = rundown_uuid 
    AND r.visibility = 'public'
    AND srl.layout_id = layout_uuid
  ) THEN
    RETURN NULL;
  END IF;
  
  -- Get the layout data
  SELECT jsonb_build_object(
    'columns', cl.columns,
    'name', cl.name
  ) INTO layout_data
  FROM column_layouts cl
  WHERE cl.id = layout_uuid;
  
  RETURN layout_data;
END;
$$;
