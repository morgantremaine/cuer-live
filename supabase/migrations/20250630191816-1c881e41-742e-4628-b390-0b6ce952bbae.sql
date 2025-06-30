
-- Enable RLS on rundown_folders table if not already enabled
ALTER TABLE public.rundown_folders ENABLE ROW LEVEL SECURITY;

-- Policy for users to view folders in their teams
CREATE POLICY "Users can view folders in their teams" 
ON public.rundown_folders 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.user_id = auth.uid() 
    AND tm.team_id = rundown_folders.team_id
  )
);

-- Policy for users to create folders in their teams
CREATE POLICY "Users can create folders in their teams" 
ON public.rundown_folders 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.user_id = auth.uid() 
    AND tm.team_id = rundown_folders.team_id
  )
  AND created_by = auth.uid()
);

-- Policy for users to update folders in their teams
CREATE POLICY "Users can update folders in their teams" 
ON public.rundown_folders 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.user_id = auth.uid() 
    AND tm.team_id = rundown_folders.team_id
  )
);

-- Policy for users to delete folders they created in their teams
CREATE POLICY "Users can delete folders they created in their teams" 
ON public.rundown_folders 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.user_id = auth.uid() 
    AND tm.team_id = rundown_folders.team_id
  )
  AND created_by = auth.uid()
);
