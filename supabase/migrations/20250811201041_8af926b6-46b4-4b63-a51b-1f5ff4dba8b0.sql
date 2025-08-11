-- Create a public function to get shared rundown data (works for anonymous users)
CREATE OR REPLACE FUNCTION public.get_public_rundown_data(rundown_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rundown_data jsonb;
BEGIN
  -- Check if the rundown exists and has a shared layout configured
  -- The existence of a shared_rundown_layouts record indicates permission to share
  IF NOT EXISTS (
    SELECT 1 
    FROM rundowns r
    JOIN shared_rundown_layouts srl ON r.id = srl.rundown_id
    WHERE r.id = rundown_uuid
  ) THEN
    -- If no shared layout exists, check if rundown has public visibility
    IF NOT EXISTS (
      SELECT 1 
      FROM rundowns 
      WHERE id = rundown_uuid 
      AND (visibility = 'public' OR visibility IS NULL)
    ) THEN
      RETURN NULL;
    END IF;
  END IF;
  
  -- Get the rundown data
  SELECT jsonb_build_object(
    'id', r.id,
    'title', r.title,
    'items', r.items,
    'columns', r.columns,
    'start_time', r.start_time,
    'timezone', r.timezone,
    'showcaller_state', r.showcaller_state,
    'created_at', r.created_at,
    'updated_at', r.updated_at,
    'visibility', r.visibility
  ) INTO rundown_data
  FROM rundowns r
  WHERE r.id = rundown_uuid;
  
  RETURN rundown_data;
END;
$function$