
-- Fix the infinite recursion in team_members RLS policies
-- Drop the problematic policies
DROP POLICY IF EXISTS "Allow team members to view team data" ON public.team_members;
DROP POLICY IF EXISTS "Allow invitation acceptance" ON public.team_members;
DROP POLICY IF EXISTS "Allow team admin management" ON public.team_members;

-- Create non-recursive RLS policies using security definer functions
CREATE POLICY "Users can view their own memberships"
  ON public.team_members
  FOR SELECT
  USING (user_id = auth.uid());

-- Allow authenticated users to insert team members (for invitation acceptance)
CREATE POLICY "Allow authenticated users to join teams"
  ON public.team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow team admins to view and manage their team members using security definer function
CREATE POLICY "Team admins can view team members"
  ON public.team_members
  FOR SELECT
  USING (public.is_team_admin_simple(auth.uid(), team_id));

-- Allow team admins to update and delete team members
CREATE POLICY "Team admins can manage team members"
  ON public.team_members
  FOR UPDATE
  USING (public.is_team_admin_simple(auth.uid(), team_id));

CREATE POLICY "Team admins can delete team members"
  ON public.team_members
  FOR DELETE
  USING (public.is_team_admin_simple(auth.uid(), team_id));

-- Ensure RLS is enabled
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
