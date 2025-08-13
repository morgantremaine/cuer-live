-- Fix realtime functionality by updating RLS policies for rundowns table
-- The current restrictive policy is preventing team members from seeing realtime updates

-- Drop the current overly restrictive policy
DROP POLICY IF EXISTS "team_members_can_manage_team_rundowns" ON public.rundowns;

-- Create separate, more appropriate policies

-- Allow team members to view ALL rundowns in their teams (needed for realtime updates)
CREATE POLICY "team_members_can_view_team_rundowns" 
ON public.rundowns 
FOR SELECT 
USING (
  team_id IS NOT NULL 
  AND team_id IN (
    SELECT team_members.team_id
    FROM team_members
    WHERE team_members.user_id = auth.uid()
  )
);

-- Allow team members to create rundowns in their teams
CREATE POLICY "team_members_can_create_team_rundowns" 
ON public.rundowns 
FOR INSERT 
WITH CHECK (
  team_id IS NOT NULL 
  AND team_id IN (
    SELECT team_members.team_id
    FROM team_members
    WHERE team_members.user_id = auth.uid()
  )
  AND user_id = auth.uid()
);

-- Allow team members to update rundowns in their teams (but maintain some restrictions)
CREATE POLICY "team_members_can_update_team_rundowns" 
ON public.rundowns 
FOR UPDATE 
USING (
  team_id IS NOT NULL 
  AND team_id IN (
    SELECT team_members.team_id
    FROM team_members
    WHERE team_members.user_id = auth.uid()
  )
);

-- Allow team members to delete rundowns in their teams (but maintain some restrictions)
CREATE POLICY "team_members_can_delete_team_rundowns" 
ON public.rundowns 
FOR DELETE 
USING (
  team_id IS NOT NULL 
  AND team_id IN (
    SELECT team_members.team_id
    FROM team_members
    WHERE team_members.user_id = auth.uid()
  )
);

-- Ensure realtime is properly configured for the rundowns table
ALTER TABLE public.rundowns REPLICA IDENTITY FULL;

-- Verify the table is in the realtime publication
-- (This should already be configured, but ensuring it's there)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'rundowns'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rundowns;
  END IF;
END $$;