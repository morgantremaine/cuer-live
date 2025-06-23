
-- First, let's clean up the conflicting RLS policies on team_members table
DROP POLICY IF EXISTS "Users can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view their team memberships" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Allow team members to view other team members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can delete team members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can update team members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can insert team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can insert team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can update team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can delete team members" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view members" ON public.team_members;
DROP POLICY IF EXISTS "Team members can manage members" ON public.team_members;
DROP POLICY IF EXISTS "Allow viewing team members" ON public.team_members;
DROP POLICY IF EXISTS "Allow managing team members" ON public.team_members;
DROP POLICY IF EXISTS "Enable read access for team members" ON public.team_members;

-- Create simplified, clear RLS policies for team_members
CREATE POLICY "Team members can view their own team" 
  ON public.team_members 
  FOR SELECT 
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team admins can manage team members" 
  ON public.team_members 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE user_id = auth.uid() 
      AND team_id = public.team_members.team_id 
      AND role = 'admin'
    )
  );

CREATE POLICY "System can insert new team members" 
  ON public.team_members 
  FOR INSERT 
  WITH CHECK (true);

-- Also ensure team_invitations policies are working correctly
DROP POLICY IF EXISTS "Team admins can view invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Team members can view invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Allow team admins to manage invitations" ON public.team_invitations;

CREATE POLICY "Team admins can manage invitations" 
  ON public.team_invitations 
  FOR ALL 
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Anyone can read invitations they were invited to" 
  ON public.team_invitations 
  FOR SELECT 
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Enable RLS on both tables if not already enabled
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
