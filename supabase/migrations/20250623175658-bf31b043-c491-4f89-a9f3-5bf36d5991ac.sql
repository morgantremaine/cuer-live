
-- Drop the problematic RLS policies that are causing 406 errors
DROP POLICY IF EXISTS "Users can view their own team memberships" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can view all team members" ON public.team_members;

-- Create a simple, direct policy for users to view their own memberships
CREATE POLICY "Direct user membership access" 
  ON public.team_members 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Create a security definer function to check if user is team admin (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_team_admin_for_member_view(target_team_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members 
    WHERE user_id = auth.uid() 
    AND team_id = target_team_id 
    AND role = 'admin'
  );
$$;

-- Create policy for team admins to view team members using the security definer function
CREATE POLICY "Team admin member access" 
  ON public.team_members 
  FOR SELECT 
  USING (public.is_team_admin_for_member_view(team_id));

-- Also fix the team_invitations policies to avoid similar issues
DROP POLICY IF EXISTS "Anyone can view invitations for their email" ON public.team_invitations;
DROP POLICY IF EXISTS "Team admins can create invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Team admins can manage invitations" ON public.team_invitations;

-- Simpler invitation policies
CREATE POLICY "Users can view invitations for their email" 
  ON public.team_invitations 
  FOR SELECT 
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR invited_by = auth.uid()
  );

CREATE POLICY "Authenticated users can create invitations" 
  ON public.team_invitations 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage their own invitations" 
  ON public.team_invitations 
  FOR ALL 
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid());

-- Create a more permissive policy for admins using security definer function
CREATE POLICY "Team admins can manage team invitations" 
  ON public.team_invitations 
  FOR ALL 
  USING (public.is_team_admin_for_member_view(team_id))
  WITH CHECK (public.is_team_admin_for_member_view(team_id));
