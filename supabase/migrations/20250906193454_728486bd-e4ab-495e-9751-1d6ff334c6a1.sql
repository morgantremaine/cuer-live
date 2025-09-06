-- Update the RLS policy to only allow the specific admin user to create notifications
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.app_notifications;

CREATE POLICY "Only app admin can create notifications" 
ON public.app_notifications 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'moragn@cuer.live'
  )
);