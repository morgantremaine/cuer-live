-- Fix RLS policy for rundown_operations to allow team members to insert operations
-- Currently only allows rundown owners, but team members need access for collaborative editing

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can insert operations for rundowns they own" ON rundown_operations;

-- Create new policy allowing team members to insert operations
CREATE POLICY "Team members can insert operations for team rundowns" 
ON rundown_operations 
FOR INSERT 
WITH CHECK (
  (auth.uid() = user_id) 
  AND (
    EXISTS (
      SELECT 1 FROM rundowns r
      WHERE r.id = rundown_operations.rundown_id 
      AND (
        r.user_id = auth.uid() 
        OR r.team_id IN (
          SELECT tm.team_id FROM team_members tm 
          WHERE tm.user_id = auth.uid()
        )
      )
    )
  )
);

-- Also update the SELECT policy to allow team members to view operations
DROP POLICY IF EXISTS "Users can view operations for rundowns they have access to" ON rundown_operations;

CREATE POLICY "Team members can view operations for accessible rundowns" 
ON rundown_operations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM rundowns r
    WHERE r.id = rundown_operations.rundown_id 
    AND (
      r.user_id = auth.uid() 
      OR r.team_id IN (
        SELECT tm.team_id FROM team_members tm 
        WHERE tm.user_id = auth.uid()
      )
    )
  )
);