-- Revert manager role changes - simplified approach

-- Update any existing manager roles back to member
UPDATE team_members SET role = 'member' WHERE role = 'manager';

-- Drop all current team_members policies
DROP POLICY IF EXISTS "Team members can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins and managers can delete team members" ON public.team_members;
DROP POLICY IF EXISTS "Allow authenticated users to join teams" ON public.team_members;
DROP POLICY IF EXISTS "Team admins and managers can view team members" ON public.team_members;

-- Restore simple, working policies
CREATE POLICY "Team members can view team members" 
ON public.team_members 
FOR SELECT 
USING (is_team_member_for_member_view(team_id));

CREATE POLICY "Users can view own memberships" 
ON public.team_members 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Team admins and managers can view team members" 
ON public.team_members 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM team_members tm2 
  WHERE tm2.team_id = team_members.team_id 
  AND tm2.user_id = auth.uid() 
  AND tm2.role IN ('admin', 'manager')
));

CREATE POLICY "Team admins can manage team members" 
ON public.team_members 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM team_members tm2 
  WHERE tm2.team_id = team_members.team_id 
  AND tm2.user_id = auth.uid() 
  AND tm2.role = 'admin'
));

CREATE POLICY "Team admins and managers can delete team members" 
ON public.team_members 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM team_members tm2 
  WHERE tm2.team_id = team_members.team_id 
  AND tm2.user_id = auth.uid() 
  AND tm2.role IN ('admin', 'manager')
) AND (
  (SELECT tm3.role FROM team_members tm3 WHERE tm3.user_id = auth.uid() AND tm3.team_id = team_members.team_id) = 'admin'
  OR role = 'member'
));

CREATE POLICY "Allow authenticated users to join teams" 
ON public.team_members 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Restore original team_invitations policies
DROP POLICY IF EXISTS "Team admins and managers can manage invitations" ON public.team_invitations;

CREATE POLICY "Team admins can manage invitations" 
ON public.team_invitations 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM team_members 
  WHERE team_members.team_id = team_invitations.team_id 
  AND team_members.user_id = auth.uid() 
  AND team_members.role = 'admin'
)) 
WITH CHECK (EXISTS (
  SELECT 1 FROM team_members 
  WHERE team_members.team_id = team_invitations.team_id 
  AND team_members.user_id = auth.uid() 
  AND team_members.role = 'admin'
));