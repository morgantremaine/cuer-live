-- Allow admin (morgan@cuer.live) to update any notification field
CREATE POLICY "Admin can update any notification"
ON app_notifications
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.email = 'morgan@cuer.live'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.email = 'morgan@cuer.live'
  )
);