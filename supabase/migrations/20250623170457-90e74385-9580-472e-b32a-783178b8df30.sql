
-- Phase 1: Database Structure Cleanup
-- Remove problematic foreign key constraints and fix RLS policies

-- First, let's clean up the team_members table structure and policies
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.team_members;
DROP POLICY IF EXISTS "Allow authenticated users to join teams" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can delete team members" ON public.team_members;

-- Create simplified, working RLS policies for team_members
CREATE POLICY "Allow team members to view team data"
  ON public.team_members
  FOR SELECT
  USING (
    user_id = auth.uid() OR 
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  );

-- Allow authenticated users to insert team members (for invitation acceptance)
CREATE POLICY "Allow invitation acceptance"
  ON public.team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow team admins to manage their team members
CREATE POLICY "Allow team admin management"
  ON public.team_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = auth.uid() 
      AND tm.team_id = team_members.team_id 
      AND tm.role = 'admin'
    )
  );

-- Add proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_team ON public.team_members(user_id, team_id);

-- Ensure profiles table has proper constraints
ALTER TABLE public.profiles 
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN id SET NOT NULL;

-- Add unique constraint on email if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_email_key' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
    END IF;
END $$;

-- Create a robust invitation acceptance function
CREATE OR REPLACE FUNCTION public.accept_invitation_secure(
  invitation_token text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  invitation_record RECORD;
  current_user_id uuid;
  result jsonb;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Begin transaction
  BEGIN
    -- Get and validate invitation
    SELECT * INTO invitation_record
    FROM team_invitations
    WHERE token = invitation_token
      AND accepted = false
      AND expires_at > now();

    IF invitation_record IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invalid or expired invitation'
      );
    END IF;

    -- Ensure user has a profile
    INSERT INTO public.profiles (id, email, full_name)
    SELECT 
      au.id, 
      au.email, 
      COALESCE(au.raw_user_meta_data ->> 'full_name', '')
    FROM auth.users au
    WHERE au.id = current_user_id
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

    -- Check if user is already a team member
    IF EXISTS (
      SELECT 1 FROM team_members 
      WHERE user_id = current_user_id 
      AND team_id = invitation_record.team_id
    ) THEN
      -- Mark invitation as accepted
      UPDATE team_invitations
      SET accepted = true
      WHERE id = invitation_record.id;
      
      RETURN jsonb_build_object(
        'success', true,
        'message', 'You are already a member of this team'
      );
    END IF;

    -- Add user to team
    INSERT INTO team_members (user_id, team_id, role)
    VALUES (current_user_id, invitation_record.team_id, 'member');

    -- Mark invitation as accepted
    UPDATE team_invitations
    SET accepted = true
    WHERE id = invitation_record.id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Successfully joined the team',
      'team_id', invitation_record.team_id
    );

  EXCEPTION
    WHEN unique_violation THEN
      -- Handle race condition
      UPDATE team_invitations
      SET accepted = true
      WHERE id = invitation_record.id;
      
      RETURN jsonb_build_object(
        'success', true,
        'message', 'You are already a member of this team'
      );
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to join team: ' || SQLERRM
      );
  END;
END;
$$;

-- Clean up any orphaned data safely
DELETE FROM public.team_members 
WHERE user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM public.profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- Clean up expired invitations
DELETE FROM public.team_invitations 
WHERE expires_at < now() - interval '24 hours';

-- Create function to cleanup expired invitations automatically
CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations_auto()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM team_invitations 
  WHERE expires_at < now() - interval '24 hours';
END;
$$;
