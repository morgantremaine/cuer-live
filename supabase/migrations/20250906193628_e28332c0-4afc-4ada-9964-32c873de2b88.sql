-- Update the RLS policy to use the correct admin email
DROP POLICY IF EXISTS "Only app admin can create notifications" ON public.app_notifications;

CREATE POLICY "Only app admin can create notifications" 
ON public.app_notifications 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'morgan@cuer.live'
  )
);