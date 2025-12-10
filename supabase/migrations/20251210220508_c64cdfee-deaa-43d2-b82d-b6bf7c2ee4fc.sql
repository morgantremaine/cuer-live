-- Allow admin (morgan@cuer.live) to view all profiles for system monitoring
CREATE POLICY "Admin can view all profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.email = 'morgan@cuer.live'
  )
);