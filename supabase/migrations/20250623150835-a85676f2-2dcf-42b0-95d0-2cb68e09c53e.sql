
-- First, let's check and fix the RLS policies for team_invitations table
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view relevant invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Team admins can manage invitations" ON public.team_invitations;

-- Create a more permissive policy for viewing invitations that works with the token-based validation
CREATE POLICY "Anyone can view invitations by token"
  ON public.team_invitations
  FOR SELECT
  USING (true);

-- Policy for team admins to insert invitations
CREATE POLICY "Team admins can create invitations"
  ON public.team_invitations
  FOR INSERT
  WITH CHECK (
    public.is_team_admin_safe(auth.uid(), team_id)
  );

-- Policy for team admins to update/delete their team's invitations
CREATE POLICY "Team admins can manage their team invitations"
  ON public.team_invitations
  FOR ALL
  USING (
    public.is_team_admin_safe(auth.uid(), team_id)
  );

-- Ensure the table has proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON public.team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON public.team_invitations(team_id);

-- Add a function to validate invitation tokens without RLS interference
CREATE OR REPLACE FUNCTION public.validate_invitation_token(token_param text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invitation_record RECORD;
  team_record RECORD;
  inviter_record RECORD;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation_record
  FROM team_invitations
  WHERE token = token_param
  AND accepted = false
  AND expires_at > now();

  IF invitation_record IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired invitation token');
  END IF;

  -- Get team details
  SELECT * INTO team_record
  FROM teams
  WHERE id = invitation_record.team_id;

  -- Get inviter profile if available
  SELECT full_name, email INTO inviter_record
  FROM profiles
  WHERE id = invitation_record.invited_by;

  RETURN jsonb_build_object(
    'valid', true,
    'invitation', jsonb_build_object(
      'id', invitation_record.id,
      'email', invitation_record.email,
      'team_id', invitation_record.team_id,
      'invited_by', invitation_record.invited_by,
      'created_at', invitation_record.created_at,
      'expires_at', invitation_record.expires_at,
      'token', invitation_record.token
    ),
    'team', jsonb_build_object(
      'id', team_record.id,
      'name', team_record.name
    ),
    'inviter', CASE 
      WHEN inviter_record IS NOT NULL THEN
        jsonb_build_object(
          'full_name', inviter_record.full_name,
          'email', inviter_record.email
        )
      ELSE NULL
    END
  );
END;
$$;

-- Add a function to clean up expired invitations (but not too aggressively)
CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only delete invitations that have been expired for more than 24 hours
  DELETE FROM team_invitations 
  WHERE expires_at < (now() - interval '24 hours');
END;
$$;
