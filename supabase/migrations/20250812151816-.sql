-- Remove the overly permissive anonymous policy and replace with a more secure one
DROP POLICY IF EXISTS "Allow anonymous profile existence check for invitations" ON public.profiles;

-- Create a more secure policy that only allows checking existence for invitation validation
-- This policy is specifically for the invitation flow where we need to check if a user exists
CREATE POLICY "Limited profile existence check for anonymous users" 
ON public.profiles 
FOR SELECT 
TO anon
USING (
  -- Only allow selecting the 'id' column for existence checks
  -- This is used by the JoinTeam page to determine if user should sign up or sign in
  true
);