-- Final fix for infinite recursion - remove all recursive policies

-- Drop all problematic policies completely
DROP POLICY IF EXISTS "Team members can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.team_members;
DROP POLICY IF EXISTS "Team admins and managers can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins and managers can delete team members" ON public.team_members;
DROP POLICY IF EXISTS "Allow authenticated users to join teams" ON public.team_members;

-- Create completely non-recursive policies using only security definer functions
CREATE POLICY "Team members can view team members using function" 
ON public.team_members 
FOR SELECT 
USING (is_team_member_for_member_view(team_id));

CREATE POLICY "Users can view own memberships only" 
ON public.team_members 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Team admins can manage using function" 
ON public.team_members 
FOR UPDATE 
USING (is_team_admin_for_member_view(team_id));

CREATE POLICY "Team admins can delete using function" 
ON public.team_members 
FOR DELETE 
USING (is_team_admin_for_member_view(team_id));

CREATE POLICY "Authenticated users can join teams" 
ON public.team_members 
FOR INSERT 
WITH CHECK (user_id = auth.uid());