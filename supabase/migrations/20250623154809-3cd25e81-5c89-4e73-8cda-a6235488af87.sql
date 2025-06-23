
-- Fix the team_members RLS policies to allow invitation acceptance
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Allow team members to view their team" ON public.team_members;
DROP POLICY IF EXISTS "Allow inserting team members" ON public.team_members;
DROP POLICY IF EXISTS "Allow team admins to manage members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view team members in their teams" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can manage their team members" ON public.team_members;
DROP POLICY IF EXISTS "Allow system to insert team members" ON public.team_members;

-- Create simplified, working RLS policies for team_members
CREATE POLICY "Team members can view their teams"
  ON public.team_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

-- Allow authenticated users to insert team members (for invitation acceptance)
CREATE POLICY "Allow authenticated users to join teams"
  ON public.team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- Allow team admins to manage their team members
CREATE POLICY "Team admins can manage team members"
  ON public.team_members
  FOR ALL
  USING (
    public.is_team_admin_safe(auth.uid(), team_id)
  );

-- Ensure RLS is enabled
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
