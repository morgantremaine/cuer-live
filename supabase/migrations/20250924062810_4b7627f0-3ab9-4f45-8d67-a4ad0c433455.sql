-- Add 'manager' as a valid role for team members
ALTER TABLE team_members 
DROP CONSTRAINT IF EXISTS team_members_role_check;

ALTER TABLE team_members 
ADD CONSTRAINT team_members_role_check 
CHECK (role IN ('admin', 'manager', 'member'));

-- Update RLS policies to allow managers to invite team members
DROP POLICY IF EXISTS "Team admins can manage invitations" ON team_invitations;

CREATE POLICY "Team admins and managers can manage invitations" 
ON team_invitations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_id = team_invitations.team_id 
    AND user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_id = team_invitations.team_id 
    AND user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

-- Update team members view policy for managers
DROP POLICY IF EXISTS "Team admins can view team members" ON team_members;

CREATE POLICY "Team admins and managers can view team members" 
ON team_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM team_members tm2 
    WHERE tm2.team_id = team_members.team_id 
    AND tm2.user_id = auth.uid() 
    AND tm2.role IN ('admin', 'manager')
  )
);

-- Update team members management policy for role changes (admin only)
DROP POLICY IF EXISTS "Team admins can manage team members" ON team_members;

CREATE POLICY "Team admins can manage team members" 
ON team_members 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM team_members tm2 
    WHERE tm2.team_id = team_members.team_id 
    AND tm2.user_id = auth.uid() 
    AND tm2.role = 'admin'
  )
);

-- Update team members delete policy for managers
DROP POLICY IF EXISTS "Team admins can delete team members" ON team_members;

CREATE POLICY "Team admins and managers can delete team members" 
ON team_members 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM team_members tm2 
    WHERE tm2.team_id = team_members.team_id 
    AND tm2.user_id = auth.uid() 
    AND tm2.role IN ('admin', 'manager')
  )
  -- Prevent managers from deleting admins or other managers
  AND (
    (SELECT role FROM team_members tm3 WHERE tm3.user_id = auth.uid() AND tm3.team_id = team_members.team_id) = 'admin'
    OR team_members.role = 'member'
  )
);

-- Create helper function to check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_team_admin_or_manager(user_uuid uuid, team_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members 
    WHERE user_id = user_uuid 
    AND team_id = team_uuid 
    AND role IN ('admin', 'manager')
  );
$$;