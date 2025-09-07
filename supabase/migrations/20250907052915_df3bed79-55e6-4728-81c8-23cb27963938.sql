-- Enable RLS and create policies for app_notifications if missing
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for app_notifications
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view active app notifications" ON public.app_notifications;
    DROP POLICY IF EXISTS "Users can view all app notifications" ON public.app_notifications;
    
    -- Create policy to allow users to view app notifications
    CREATE POLICY "Users can view app notifications" 
    ON public.app_notifications 
    FOR SELECT 
    USING (true);
END $$;

-- Enable RLS and create policies for app_notification_dismissals if missing  
ALTER TABLE public.app_notification_dismissals ENABLE ROW LEVEL SECURITY;

-- Create policies for app_notification_dismissals
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own dismissals" ON public.app_notification_dismissals;
    DROP POLICY IF EXISTS "Users can insert their own dismissals" ON public.app_notification_dismissals;
    
    -- Create policies for dismissals
    CREATE POLICY "Users can view their own dismissals" 
    ON public.app_notification_dismissals 
    FOR SELECT 
    USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can insert their own dismissals" 
    ON public.app_notification_dismissals 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
END $$;