
-- Clean up duplicate and redundant RLS policies

-- First, drop all existing team_members policies to start fresh
DROP POLICY IF EXISTS "Direct user membership access" ON public.team_members;
DROP POLICY IF EXISTS "Team admin member access" ON public.team_members;
DROP POLICY IF EXISTS "Users can view their own team memberships" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can view all team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view other team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view own team memberships" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view all team members" ON public.team_members;

-- Drop all existing team_invitations policies to start fresh
DROP POLICY IF EXISTS "Users can view relevant invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Authenticated users create invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Users manage own invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Users delete own invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Users can view invitations for their email" ON public.team_invitations;
DROP POLICY IF EXISTS "Authenticated users can create invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Users can manage their own invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Team admins can manage team invitations" ON public.team_invitations;

-- Create clean, non-conflicting policies for team_members
CREATE POLICY "Users can view own memberships" 
  ON public.team_members 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Team members can view team members" 
  ON public.team_members 
  FOR SELECT 
  USING (public.is_team_member_for_member_view(team_id));

-- Create clean, non-conflicting policies for team_invitations
CREATE POLICY "Users can view relevant invitations" 
  ON public.team_invitations 
  FOR SELECT 
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR invited_by = auth.uid()
    OR public.is_team_admin_for_member_view(team_id)
  );

CREATE POLICY "Authenticated users can create invitations" 
  ON public.team_invitations 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update invitations" 
  ON public.team_invitations 
  FOR UPDATE 
  USING (invited_by = auth.uid() OR public.is_team_admin_for_member_view(team_id))
  WITH CHECK (invited_by = auth.uid() OR public.is_team_admin_for_member_view(team_id));

CREATE POLICY "Users can delete invitations" 
  ON public.team_invitations 
  FOR DELETE 
  USING (invited_by = auth.uid() OR public.is_team_admin_for_member_view(team_id));

-- Add constraint to prevent duplicate team memberships
ALTER TABLE public.team_members 
DROP CONSTRAINT IF EXISTS unique_user_team_membership;

ALTER TABLE public.team_members 
ADD CONSTRAINT unique_user_team_membership 
UNIQUE (user_id, team_id);

-- Clean up any existing duplicate memberships
DELETE FROM public.team_members a
WHERE a.ctid <> (
  SELECT min(b.ctid)
  FROM public.team_members b
  WHERE a.user_id = b.user_id AND a.team_id = b.team_id
);

-- Create function to prevent duplicate team creation
CREATE OR REPLACE FUNCTION public.get_or_create_user_team(user_uuid uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  existing_team_id uuid;
  new_team_id uuid;
  user_email text;
BEGIN
  -- Check if user already has a team
  SELECT team_id INTO existing_team_id
  FROM team_members
  WHERE user_id = user_uuid
  LIMIT 1;
  
  IF existing_team_id IS NOT NULL THEN
    RETURN existing_team_id;
  END IF;
  
  -- Get user email for team name
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_uuid;
  
  -- Create new team
  INSERT INTO teams (name)
  VALUES (split_part(COALESCE(user_email, 'User'), '@', 1) || '''s Team')
  RETURNING id INTO new_team_id;
  
  -- Add user as admin
  INSERT INTO team_members (user_id, team_id, role)
  VALUES (user_uuid, new_team_id, 'admin')
  ON CONFLICT (user_id, team_id) DO NOTHING;
  
  RETURN new_team_id;
END;
$$;
