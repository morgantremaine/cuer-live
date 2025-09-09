-- Create tables for operational transform real-time sync
CREATE TABLE public.rundown_operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rundown_id UUID NOT NULL,
  user_id UUID NOT NULL,
  operation_type TEXT NOT NULL,
  operation_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.rundown_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rundown_id UUID NOT NULL,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.rundown_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rundown_presence ENABLE ROW LEVEL SECURITY;

-- Create policies for rundown_operations
CREATE POLICY "Users can view operations for rundowns they have access to" 
ON public.rundown_operations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.rundowns 
    WHERE rundowns.id = rundown_operations.rundown_id 
    AND rundowns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert operations for rundowns they own" 
ON public.rundown_operations 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.rundowns 
    WHERE rundowns.id = rundown_operations.rundown_id 
    AND rundowns.user_id = auth.uid()
  )
);

-- Create policies for rundown_presence
CREATE POLICY "Users can view presence for rundowns they have access to" 
ON public.rundown_presence 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.rundowns 
    WHERE rundowns.id = rundown_presence.rundown_id 
    AND rundowns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert presence for rundowns they own" 
ON public.rundown_presence 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.rundowns 
    WHERE rundowns.id = rundown_presence.rundown_id 
    AND rundowns.user_id = auth.uid()
  )
);

-- Add indexes for performance
CREATE INDEX idx_rundown_operations_rundown_id ON public.rundown_operations(rundown_id);
CREATE INDEX idx_rundown_operations_created_at ON public.rundown_operations(created_at);
CREATE INDEX idx_rundown_presence_rundown_id ON public.rundown_presence(rundown_id);
CREATE INDEX idx_rundown_presence_created_at ON public.rundown_presence(created_at);

-- Auto-cleanup old records (keep last 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_operations()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rundown_operations 
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  DELETE FROM public.rundown_presence 
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup (this would typically be done with pg_cron in production)
-- For now, we'll rely on application-level cleanup