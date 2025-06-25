
-- Create a security definer function to safely get layout data for public rundowns
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
  -- First, check if the rundown exists and is public
  SELECT visibility INTO rundown_visibility
  FROM rundowns
  WHERE id = rundown_uuid;
  
  -- If rundown doesn't exist or is not public, return null
  IF rundown_visibility IS NULL OR (rundown_visibility != 'public' AND rundown_visibility IS NOT NULL) THEN
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

-- Also update the existing RLS policies to be more permissive for public rundowns
DROP POLICY IF EXISTS "Public can view shared layouts for public rundowns" ON public.shared_rundown_layouts;
DROP POLICY IF EXISTS "Public can view layouts used by public rundowns" ON public.column_layouts;

-- Create more permissive policies for shared layouts
CREATE POLICY "Allow shared layout access for public rundowns" 
  ON public.shared_rundown_layouts 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.rundowns r
      WHERE r.id = shared_rundown_layouts.rundown_id
      AND (r.visibility = 'public' OR r.visibility IS NULL)
    )
  );

-- Create more permissive policies for column layouts
CREATE POLICY "Allow layout access for public shared rundowns" 
  ON public.column_layouts 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_rundown_layouts srl
      JOIN public.rundowns r ON r.id = srl.rundown_id
      WHERE srl.layout_id = column_layouts.id
      AND (r.visibility = 'public' OR r.visibility IS NULL)
    )
  );
