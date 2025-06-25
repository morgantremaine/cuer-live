
-- First, ensure RLS is enabled on both tables
ALTER TABLE public.shared_rundown_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.column_layouts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Public can access shared layouts for public rundowns" ON public.shared_rundown_layouts;
DROP POLICY IF EXISTS "Public can access layouts used by public rundowns" ON public.column_layouts;

-- Create a simpler, more explicit policy for shared_rundown_layouts
CREATE POLICY "Allow anonymous access to shared layouts for public rundowns" 
  ON public.shared_rundown_layouts 
  FOR SELECT 
  USING (
    -- Allow access if the rundown is public or has null visibility
    EXISTS (
      SELECT 1 FROM public.rundowns 
      WHERE rundowns.id = shared_rundown_layouts.rundown_id
      AND (rundowns.visibility = 'public' OR rundowns.visibility IS NULL)
    )
  );

-- Create a policy for column_layouts that allows access when they're used by public rundowns
CREATE POLICY "Allow anonymous access to layouts for public rundowns" 
  ON public.column_layouts 
  FOR SELECT 
  USING (
    -- Allow if this layout is shared for a public rundown
    EXISTS (
      SELECT 1 
      FROM public.shared_rundown_layouts srl
      JOIN public.rundowns r ON r.id = srl.rundown_id
      WHERE srl.layout_id = column_layouts.id
      AND (r.visibility = 'public' OR r.visibility IS NULL)
    )
    OR
    -- Keep existing access for authenticated users
    (
      auth.uid() IS NOT NULL AND (
        column_layouts.user_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM public.team_members 
          WHERE team_members.user_id = auth.uid() 
          AND team_members.team_id = column_layouts.team_id
        )
      )
    )
  );
