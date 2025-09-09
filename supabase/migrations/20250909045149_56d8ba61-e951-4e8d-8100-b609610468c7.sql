-- Create table for operational transform real-time sync (operations only)
CREATE TABLE IF NOT EXISTS public.rundown_operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rundown_id UUID NOT NULL,
  user_id UUID NOT NULL,
  operation_type TEXT NOT NULL,
  operation_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security if not already enabled
ALTER TABLE public.rundown_operations ENABLE ROW LEVEL SECURITY;

-- Create policies for rundown_operations if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'rundown_operations' 
    AND policyname = 'Users can view operations for rundowns they have access to'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'rundown_operations' 
    AND policyname = 'Users can insert operations for rundowns they own'
  ) THEN
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
  END IF;
END $$;

-- Add indexes for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_rundown_operations_rundown_id ON public.rundown_operations(rundown_id);
CREATE INDEX IF NOT EXISTS idx_rundown_operations_created_at ON public.rundown_operations(created_at);

-- Auto-cleanup old records function (keep last 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_operations()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rundown_operations 
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  -- Also clean up existing rundown_presence records
  DELETE FROM public.rundown_presence 
  WHERE last_seen < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;