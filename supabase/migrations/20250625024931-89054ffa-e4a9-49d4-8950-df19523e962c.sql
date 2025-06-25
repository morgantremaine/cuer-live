
-- Update RLS policies to allow anonymous access to shared layouts for public rundowns
DROP POLICY IF EXISTS "Allow shared layout access for public rundowns" ON public.shared_rundown_layouts;
DROP POLICY IF EXISTS "Allow layout access for public shared rundowns" ON public.column_layouts;

-- More permissive policy for shared_rundown_layouts - allow anonymous access for public rundowns
CREATE POLICY "Public can access shared layouts for public rundowns" 
  ON public.shared_rundown_layouts 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.rundowns r
      WHERE r.id = shared_rundown_layouts.rundown_id
      AND (r.visibility = 'public' OR r.visibility IS NULL)
    )
  );

-- More permissive policy for column_layouts - allow anonymous access when used by public rundowns
CREATE POLICY "Public can access layouts used by public rundowns" 
  ON public.column_layouts 
  FOR SELECT 
  USING (
    -- Allow access if this layout is shared for a public rundown
    EXISTS (
      SELECT 1 FROM public.shared_rundown_layouts srl
      JOIN public.rundowns r ON r.id = srl.rundown_id
      WHERE srl.layout_id = column_layouts.id
      AND (r.visibility = 'public' OR r.visibility IS NULL)
    )
    OR
    -- Also allow access for the owner and team members (existing functionality)
    (
      auth.uid() IS NOT NULL AND (
        user_id = auth.uid() 
        OR team_id IN (
          SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
      )
    )
  );
