-- Final security fix: Address remaining issues with correct syntax

-- 1. Fix profiles table - remove any public access policies
DROP POLICY IF EXISTS "Team members can view same team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Can view inviter profiles for valid invitations" ON public.profiles;
DROP POLICY IF EXISTS "Users can view inviter profiles" ON public.profiles;

-- Create secure policies for profiles table
-- Users can only view their own profile
CREATE POLICY "Users can view own profile only" ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Team members can view profiles only within their teams
CREATE POLICY "Team members can view team profiles restricted" ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid() OR
  EXISTS (
    SELECT 1 
    FROM team_members tm1
    JOIN team_members tm2 ON tm1.team_id = tm2.team_id
    WHERE tm1.user_id = auth.uid() 
    AND tm2.user_id = profiles.id
  )
);

-- Special case: allow viewing inviter profiles for pending invitations
CREATE POLICY "Can view inviter for pending invitations" ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM team_invitations 
    WHERE team_invitations.invited_by = profiles.id
    AND team_invitations.email = auth.email()
    AND team_invitations.accepted = false 
    AND team_invitations.expires_at > now()
  )
);

-- 2. Ensure subscribers table is completely locked down
-- Remove the policy that was recreated and make it even more restrictive
DROP POLICY IF EXISTS "Users can view own subscription by user_id only" ON public.subscribers;
DROP POLICY IF EXISTS "Users cannot modify subscription data" ON public.subscribers;

-- Only allow viewing own subscription data
CREATE POLICY "View own subscription only" ON public.subscribers
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Block user modifications with separate policies
CREATE POLICY "Block user insert to subscriptions" ON public.subscribers
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Block user update to subscriptions" ON public.subscribers
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Block user delete to subscriptions" ON public.subscribers
FOR DELETE
TO authenticated
USING (false);

-- 3. Fix team_invitations to be more restrictive
DROP POLICY IF EXISTS "Secure invitation viewing" ON public.team_invitations;

-- Create the most restrictive policy possible
CREATE POLICY "Highly restricted invitation viewing" ON public.team_invitations
FOR SELECT
TO authenticated
USING (
  -- Only if you sent the invitation
  invited_by = auth.uid() OR 
  -- Only if you're an admin of the team
  is_team_admin_safe(auth.uid(), team_id)
);

-- 4. Completely revoke anonymous access to all sensitive tables
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.subscribers FROM anon;
REVOKE ALL ON public.team_invitations FROM anon;
REVOKE ALL ON public.team_api_keys FROM anon;

-- Grant minimal necessary permissions
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.subscribers TO authenticated;
GRANT SELECT ON public.team_invitations TO authenticated;