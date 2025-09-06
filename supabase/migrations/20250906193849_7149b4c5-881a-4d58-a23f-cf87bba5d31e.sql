-- Update the RLS policy to use profiles table instead of auth.users
DROP POLICY IF EXISTS "Only app admin can create notifications" ON public.app_notifications;

CREATE POLICY "Only app admin can create notifications" 
ON public.app_notifications 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND email = 'morgan@cuer.live'
  )
);