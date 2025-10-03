-- Add 'manager' role support to team_members
-- Note: is_team_admin_or_manager() function already exists

-- Update team_invitations RLS policies to allow managers to manage invitations
DROP POLICY IF EXISTS "Team admins can manage invitations" ON team_invitations;

CREATE POLICY "Team admins and managers can manage invitations" 
ON team_invitations
FOR ALL
TO authenticated
USING (
  is_team_admin_or_manager(auth.uid(), team_id)
)
WITH CHECK (
  is_team_admin_or_manager(auth.uid(), team_id)
);

-- Update team_members RLS policies to allow managers to manage members
DROP POLICY IF EXISTS "Team admins can manage using function" ON team_members;
DROP POLICY IF EXISTS "Team admins can delete using function" ON team_members;

CREATE POLICY "Team admins and managers can update members" 
ON team_members
FOR UPDATE
TO authenticated
USING (
  is_team_admin_or_manager(auth.uid(), team_id)
);

CREATE POLICY "Team admins and managers can delete members" 
ON team_members
FOR DELETE
TO authenticated
USING (
  is_team_admin_or_manager(auth.uid(), team_id)
);