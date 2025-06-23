
-- Revert migration: Clean up all conflicting RLS policies and restore working team system
-- This will remove all the broken policies and restore simple, working ones

-- First, completely drop ALL existing policies on both tables to start clean
DROP POLICY IF EXISTS "Team members can view their own team" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "System can insert new team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view their team memberships" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Allow team members to view other team members" ON public.team_members;
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

-- Drop all invitation policies
DROP POLICY IF EXISTS "Team admins can manage invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Anyone can read invitations they were invited to" ON public.team_invitations;
DROP POLICY IF EXISTS "Team admins can view invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Team members can view invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Allow team admins to manage invitations" ON public.team_invitations;

-- Now create simple, working RLS policies based on the working system before

-- Simple team_members policies that work
CREATE POLICY "Allow team members to view their team"
  ON public.team_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Allow inserting team members"
  ON public.team_members
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow team admins to manage members"
  ON public.team_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = auth.uid()
      AND tm.team_id = public.team_members.team_id
      AND tm.role = 'admin'
    )
  );

-- Simple team_invitations policies that work
CREATE POLICY "Allow reading relevant invitations"
  ON public.team_invitations
  FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow team admins to manage their invitations"
  ON public.team_invitations
  FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Ensure RLS is enabled
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
