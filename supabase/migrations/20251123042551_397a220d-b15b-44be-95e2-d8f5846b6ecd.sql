-- Add role column to team_invitations table
ALTER TABLE team_invitations 
ADD COLUMN role text NOT NULL DEFAULT 'member' 
CHECK (role IN ('member', 'manager', 'showcaller', 'teleprompter'));

-- Update accept_invitation_secure function to use role from invitation
CREATE OR REPLACE FUNCTION public.accept_invitation_secure(invitation_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    invitation_record RECORD;
    team_record RECORD;
    result json;
BEGIN
    -- Validate input
    IF invitation_token IS NULL OR invitation_token = '' THEN
        RETURN json_build_object('success', false, 'error', 'Invalid invitation token');
    END IF;

    -- Get the invitation details INCLUDING THE ROLE
    SELECT id, team_id, email, invited_by, accepted, expires_at, role
    INTO invitation_record
    FROM team_invitations 
    WHERE token = invitation_token;

    IF invitation_record IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invitation not found');
    END IF;

    IF invitation_record.accepted THEN
        RETURN json_build_object('success', false, 'error', 'This invitation has already been accepted');
    END IF;

    IF invitation_record.expires_at < now() THEN
        RETURN json_build_object('success', false, 'error', 'This invitation has expired');
    END IF;

    -- Get team info
    SELECT * INTO team_record FROM teams WHERE id = invitation_record.team_id;
    
    IF team_record IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Team not found');
    END IF;

    -- Add user to team WITH THE ROLE FROM THE INVITATION
    INSERT INTO team_members (user_id, team_id, role)
    VALUES (auth.uid(), invitation_record.team_id, invitation_record.role)
    ON CONFLICT (user_id, team_id) DO NOTHING;

    -- Mark invitation as accepted
    UPDATE team_invitations 
    SET accepted = true 
    WHERE id = invitation_record.id;

    RETURN json_build_object(
        'success', true,
        'team_id', team_record.id,
        'team_name', team_record.name,
        'role', invitation_record.role
    );
END;
$function$;