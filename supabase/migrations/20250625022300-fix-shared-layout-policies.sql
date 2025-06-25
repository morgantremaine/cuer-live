
-- Remove the restrictive policies and create more permissive ones
DROP POLICY IF EXISTS "Allow shared layout access for public rundowns" ON public.shared_rundown_layouts;
DROP POLICY IF EXISTS "Allow layout access for public shared rundowns" ON public.column_layouts;

-- Create policies that allow anonymous access to shared layouts for ANY shared rundown
-- (not just public ones, since shared rundowns should be accessible regardless of visibility)
CREATE POLICY "Anonymous can view all shared rundown layouts" 
  ON public.shared_rundown_layouts 
  FOR SELECT 
  TO anon, authenticated
  USING (true);

-- Allow anonymous access to column layouts that are used by shared rundowns
CREATE POLICY "Anonymous can view shared column layouts" 
  ON public.column_layouts 
  FOR SELECT 
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_rundown_layouts srl
      WHERE srl.layout_id = column_layouts.id
    )
  );

-- Also update the RPC function to not check visibility at all - if someone has the link, they should see the layout
CREATE OR REPLACE FUNCTION public.get_shared_layout_for_public_rundown(rundown_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
DECLARE
  layout_data jsonb;
BEGIN
  -- Get the shared layout configuration for this rundown (no visibility check)
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
