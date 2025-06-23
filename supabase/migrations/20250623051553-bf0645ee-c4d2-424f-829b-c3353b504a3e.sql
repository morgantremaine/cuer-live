
-- First, get a complete list of all policies and drop them systematically
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all policies on team_members table
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'team_members' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.team_members', policy_record.policyname);
    END LOOP;
    
    -- Drop all policies on team_invitations table
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'team_invitations' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.team_invitations', policy_record.policyname);
    END LOOP;
END
$$;

-- Create security definer functions to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.get_user_team_ids_safe(user_uuid uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ARRAY(
    SELECT team_id FROM team_members 
    WHERE user_id = user_uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_admin_safe(user_uuid uuid, team_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members 
    WHERE user_id = user_uuid 
    AND team_id = team_uuid 
    AND role = 'admin'
  );
$$;

-- Create new, simple RLS policies using security definer functions
CREATE POLICY "Users can view team members in their teams"
  ON public.team_members
  FOR SELECT
  USING (
    team_id = ANY(public.get_user_team_ids_safe(auth.uid()))
  );

CREATE POLICY "Team admins can manage their team members"
  ON public.team_members
  FOR ALL
  USING (
    public.is_team_admin_safe(auth.uid(), team_id)
  );

CREATE POLICY "Allow system to insert team members"
  ON public.team_members
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view relevant invitations"
  ON public.team_invitations
  FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR public.is_team_admin_safe(auth.uid(), team_id)
  );

CREATE POLICY "Team admins can manage invitations"
  ON public.team_invitations
  FOR ALL
  USING (
    public.is_team_admin_safe(auth.uid(), team_id)
  );

-- Ensure RLS is enabled
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
