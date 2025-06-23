
-- First, let's see what policies exist and drop them all safely
DO $$ 
BEGIN
    -- Drop all existing team_members policies
    DROP POLICY IF EXISTS "Direct user membership access" ON public.team_members;
    DROP POLICY IF EXISTS "Team admin member access" ON public.team_members;
    DROP POLICY IF EXISTS "Users can view their own team memberships" ON public.team_members;
    DROP POLICY IF EXISTS "Team admins can view all team members" ON public.team_members;
    DROP POLICY IF EXISTS "Users can view their own memberships" ON public.team_members;
    DROP POLICY IF EXISTS "Team members can view other team members" ON public.team_members;

    -- Drop all existing team_invitations policies
    DROP POLICY IF EXISTS "Users can view invitations for their email" ON public.team_invitations;
    DROP POLICY IF EXISTS "Authenticated users can create invitations" ON public.team_invitations;
    DROP POLICY IF EXISTS "Users can manage their own invitations" ON public.team_invitations;
    DROP POLICY IF EXISTS "Team admins can manage team invitations" ON public.team_invitations;
    DROP POLICY IF EXISTS "Anyone can view invitations for their email" ON public.team_invitations;
    DROP POLICY IF EXISTS "Team admins can create invitations" ON public.team_invitations;
    DROP POLICY IF EXISTS "Team admins can manage invitations" ON public.team_invitations;
    DROP POLICY IF EXISTS "Users can delete their own invitations" ON public.team_invitations;
END $$;

-- Create or replace the security definer functions
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

CREATE OR REPLACE FUNCTION public.is_team_member_for_member_view(target_team_id uuid)
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
  );
$$;

-- Now create the new policies
CREATE POLICY "Users can view own team memberships" 
  ON public.team_members 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Team members can view all team members" 
  ON public.team_members 
  FOR SELECT 
  USING (public.is_team_member_for_member_view(team_id));

-- Create team_invitations policies
CREATE POLICY "Users can view relevant invitations" 
  ON public.team_invitations 
  FOR SELECT 
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR invited_by = auth.uid()
    OR public.is_team_admin_for_member_view(team_id)
  );

CREATE POLICY "Authenticated users create invitations" 
  ON public.team_invitations 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users manage own invitations" 
  ON public.team_invitations 
  FOR UPDATE 
  USING (invited_by = auth.uid() OR public.is_team_admin_for_member_view(team_id))
  WITH CHECK (invited_by = auth.uid() OR public.is_team_admin_for_member_view(team_id));

CREATE POLICY "Users delete own invitations" 
  ON public.team_invitations 
  FOR DELETE 
  USING (invited_by = auth.uid() OR public.is_team_admin_for_member_view(team_id));
