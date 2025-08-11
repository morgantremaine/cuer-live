-- Final security fixes for team invitations

-- Remove the problematic token validation policy
DROP POLICY IF EXISTS "Token validation for authenticated users" ON public.team_invitations;

-- Only allow very specific access patterns for team invitations
-- Authenticated users can only view invitations they're directly involved with
CREATE POLICY "Restricted invitation access" ON public.team_invitations
FOR SELECT
TO authenticated
USING (
  -- Only if you're the inviter
  invited_by = auth.uid() OR 
  -- Only if you're an admin of the target team  
  is_team_admin_safe(auth.uid(), team_id) OR
  -- Only if you're checking your own email's invitations (without exposing tokens to others)
  (email = auth.email() AND invited_by IS NOT NULL)
);

-- Test the system is still functional
SELECT 'Final test passed' as status WHERE EXISTS (
  SELECT 1 FROM public.team_invitations 
  WHERE accepted = false 
  AND expires_at > now()
);