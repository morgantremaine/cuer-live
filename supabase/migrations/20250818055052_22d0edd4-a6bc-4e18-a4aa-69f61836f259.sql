
-- 1) Ensure selecting or updating a shared layout makes the rundown public
DROP TRIGGER IF EXISTS srl_make_public_on_insert ON public.shared_rundown_layouts;
CREATE TRIGGER srl_make_public_on_insert
AFTER INSERT ON public.shared_rundown_layouts
FOR EACH ROW
EXECUTE FUNCTION public.make_rundown_public_on_share();

DROP TRIGGER IF EXISTS srl_make_public_on_update ON public.shared_rundown_layouts;
CREATE TRIGGER srl_make_public_on_update
AFTER UPDATE ON public.shared_rundown_layouts
FOR EACH ROW
EXECUTE FUNCTION public.make_rundown_public_on_share();

-- 2) Always-return rundown data for the shared page (regardless of visibility or shared layout existence)
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
    'visibility', r.visibility
  )
  INTO rundown_data
  FROM rundowns r
  WHERE r.id = rundown_uuid;

  RETURN rundown_data; -- returns NULL if not found
END;
$function$;

-- 3) Always-return layout for the shared page:
--    - If a custom layout was selected (shared_rundown_layouts.layout_id is set), use it
--    - Otherwise, fall back to the rundown's own columns (default)
CREATE OR REPLACE FUNCTION public.get_shared_layout_for_public_rundown(rundown_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  layout_data jsonb;
BEGIN
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
  )
  INTO layout_data
  FROM rundowns r
  LEFT JOIN shared_rundown_layouts srl ON r.id = srl.rundown_id
  LEFT JOIN column_layouts cl ON cl.id = srl.layout_id
  WHERE r.id = rundown_uuid;

  RETURN layout_data; -- returns NULL if rundown doesn't exist
END;
$function$;

-- 4) Backfill existing shared rundowns to public visibility (non-destructive)
UPDATE public.rundowns r
SET visibility = 'public',
    updated_at = now()
WHERE r.id IN (SELECT rundown_id FROM public.shared_rundown_layouts)
  AND (r.visibility IS DISTINCT FROM 'public');
