-- First, let's see what the current accept_invitation_secure function returns
-- Then update it to return the team_id for proper team switching

-- Drop the existing function and recreate it to return team_id
DROP FUNCTION IF EXISTS accept_invitation_secure(text);

CREATE OR REPLACE FUNCTION accept_invitation_secure(invitation_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    invitation_record RECORD;
    team_record RECORD;
    result json;
BEGIN
    -- Validate input
    IF invitation_token IS NULL OR invitation_token = '' THEN
        RETURN json_build_object('success', false, 'error', 'Invalid invitation token');
    END IF;

    -- Get the invitation details
    SELECT id, team_id, email, invited_by, accepted, expires_at
    INTO invitation_record
    FROM team_invitations 
    WHERE token = invitation_token;

    -- Check if invitation exists
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Invitation not found');
    END IF;

    -- Check if invitation has already been accepted
    IF invitation_record.accepted THEN
        RETURN json_build_object('success', false, 'error', 'Invitation has already been accepted');
    END IF;

    -- Check if invitation has expired
    IF invitation_record.expires_at < NOW() THEN
        RETURN json_build_object('success', false, 'error', 'Invitation has expired');
    END IF;

    -- Verify the authenticated user's email matches the invitation
    IF auth.email() != invitation_record.email THEN
        RETURN json_build_object('success', false, 'error', 'Email mismatch');
    END IF;

    -- Get team details
    SELECT name INTO team_record FROM teams WHERE id = invitation_record.team_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Team not found');
    END IF;

    -- Add user to team (if not already a member)
    INSERT INTO team_members (user_id, team_id, role)
    VALUES (auth.uid(), invitation_record.team_id, 'member')
    ON CONFLICT (user_id, team_id) DO NOTHING;

    -- Mark invitation as accepted
    UPDATE team_invitations 
    SET accepted = true, updated_at = NOW()
    WHERE id = invitation_record.id;

    -- Return success with team_id for proper team switching
    RETURN json_build_object(
        'success', true, 
        'team_id', invitation_record.team_id,
        'team_name', team_record.name
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', 'Database error occurred');
END;
$$;