-- Update get_public_rundown_data to include locked numbering fields
CREATE OR REPLACE FUNCTION public.get_public_rundown_data(rundown_uuid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rundown_data jsonb;
BEGIN
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
    'visibility', r.visibility,
    'doc_version', r.doc_version,
    'last_updated_by', r.last_updated_by,
    'numbering_locked', r.numbering_locked,
    'locked_row_numbers', r.locked_row_numbers
  )
  INTO rundown_data
  FROM rundowns r
  WHERE r.id = rundown_uuid;

  RETURN rundown_data;
END;
$function$;