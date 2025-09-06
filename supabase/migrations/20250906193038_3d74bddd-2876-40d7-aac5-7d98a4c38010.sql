-- Create table for app-wide notifications
CREATE TABLE public.app_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'update',
  title TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read notifications (they're app-wide)
CREATE POLICY "Everyone can read app notifications" 
ON public.app_notifications 
FOR SELECT 
USING (active = true);

-- Only allow authenticated users to create notifications (for admin purposes)
CREATE POLICY "Authenticated users can create notifications" 
ON public.app_notifications 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Add to realtime publication
ALTER publication supabase_realtime ADD TABLE public.app_notifications;