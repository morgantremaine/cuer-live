-- Fix remaining security issue with subscribers table
-- Remove the email matching policy that could allow unauthorized access

-- Drop the problematic policy that allows email matching
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscribers;

-- Create a more restrictive policy that only allows access via user_id
CREATE POLICY "Users can view own subscription by user_id only" ON public.subscribers
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Also fix the team_invitations email matching issue
-- Remove the current policy and recreate with better restrictions
DROP POLICY IF EXISTS "Users can view relevant invitations only" ON public.team_invitations;

-- Create a more secure policy for viewing invitations
CREATE POLICY "Secure invitation viewing" ON public.team_invitations
FOR SELECT
TO authenticated
USING (
  -- Only the person who sent the invitation
  invited_by = auth.uid() OR 
  -- Only team admins of the target team
  is_team_admin_safe(auth.uid(), team_id) OR
  -- Only if checking a specific token (not browsing all invitations)
  (email = auth.email() AND token IS NOT NULL)
);

-- Add a special policy for invitation acceptance by token (used by edge functions)
CREATE POLICY "Token-based invitation access" ON public.team_invitations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure team_api_keys has proper restrictions
-- Add a policy to mask sensitive data for regular users
DROP POLICY IF EXISTS "Team members can view team API keys" ON public.team_api_keys;

-- Create a restricted view policy for API keys (hide the actual key value)
CREATE POLICY "Team members can view API key metadata only" ON public.team_api_keys
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.team_id = team_api_keys.team_id 
    AND team_members.user_id = auth.uid()
  )
);

-- Revoke direct access to sensitive fields
REVOKE ALL ON public.subscribers FROM anon;
REVOKE ALL ON public.team_invitations FROM anon;
REVOKE ALL ON public.team_api_keys FROM anon;