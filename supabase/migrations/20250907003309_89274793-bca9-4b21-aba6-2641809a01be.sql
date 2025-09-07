-- Create a table to track which users have dismissed which notifications
CREATE TABLE public.app_notification_dismissals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  notification_id UUID NOT NULL,
  dismissed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_id)
);

-- Enable RLS
ALTER TABLE public.app_notification_dismissals ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own dismissals
CREATE POLICY "Users can manage their own dismissals" 
ON public.app_notification_dismissals 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update the app_notifications RLS policy to allow updates for dismissal tracking
DROP POLICY IF EXISTS "Only app admin can create notifications" ON public.app_notifications;
CREATE POLICY "Only app admin can create notifications" 
ON public.app_notifications 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.email = 'morgan@cuer.live'
));

-- Allow users to update notifications for dismissal purposes (but keep title/message readonly via trigger)
CREATE POLICY "Users can track interaction with notifications" 
ON public.app_notifications 
FOR UPDATE 
USING (active = true);