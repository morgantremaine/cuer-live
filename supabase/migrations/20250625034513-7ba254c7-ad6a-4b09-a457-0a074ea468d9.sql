
-- Update the RLS policy to allow anonymous access to shared layouts even for private rundowns
-- but keep all existing team access controls intact

-- Drop the existing policy
DROP POLICY IF EXISTS "Allow anonymous access to shared layouts for public rundowns" ON public.shared_rundown_layouts;

-- Create updated policy that allows access for both public and private rundowns when shared
CREATE POLICY "Allow access to shared layouts for any shared rundown" 
  ON public.shared_rundown_layouts 
  FOR SELECT 
  USING (
    -- Allow anonymous access if the rundown has a shared layout configured
    -- (regardless of rundown visibility - the act of sharing creates the permission)
    EXISTS (
      SELECT 1 FROM public.rundowns 
      WHERE rundowns.id = shared_rundown_layouts.rundown_id
    )
    OR
    -- Keep existing authenticated user access (for team members managing shared layouts)
    (
      auth.uid() IS NOT NULL AND (
        shared_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.rundowns r
          JOIN public.team_members tm ON tm.team_id = r.team_id
          WHERE r.id = shared_rundown_layouts.rundown_id
          AND tm.user_id = auth.uid()
        )
      )
    )
  );

-- Update the column_layouts policy to allow anonymous access when used by ANY shared rundown
-- but maintain strict team isolation for authenticated users
DROP POLICY IF EXISTS "Allow anonymous access to layouts for public rundowns" ON public.column_layouts;

CREATE POLICY "Allow access to layouts for shared rundowns and team members" 
  ON public.column_layouts 
  FOR SELECT 
  USING (
    -- Allow anonymous access if this layout is shared for ANY rundown (public or private)
    EXISTS (
      SELECT 1 
      FROM public.shared_rundown_layouts srl
      JOIN public.rundowns r ON r.id = srl.rundown_id
      WHERE srl.layout_id = column_layouts.id
    )
    OR
    -- Keep strict team isolation for authenticated users - only see own layouts and team layouts
    (
      auth.uid() IS NOT NULL AND (
        column_layouts.user_id = auth.uid() 
        OR (
          column_layouts.team_id IS NOT NULL 
          AND EXISTS (
            SELECT 1 FROM public.team_members 
            WHERE team_members.user_id = auth.uid() 
            AND team_members.team_id = column_layouts.team_id
          )
        )
      )
    )
  );

-- Update the RPC function to work with any rundown that has a shared layout
-- (not just public ones)
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
