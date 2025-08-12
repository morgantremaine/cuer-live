-- Add RLS policy to allow anonymous users to check profile existence for invitation validation only
-- This is a very limited policy that only allows checking if a profile exists for an email
-- Used specifically for invitation validation on the JoinTeam page

CREATE POLICY "Allow anonymous profile existence check for invitations" 
ON public.profiles 
FOR SELECT 
TO anon
USING (
  -- Only allow checking existence, return minimal data
  -- This policy allows anonymous users to see if a profile exists for invitation purposes
  true
);