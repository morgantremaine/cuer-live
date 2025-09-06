-- Create table for user rundown zoom preferences
CREATE TABLE public.user_rundown_zoom_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  rundown_id UUID NOT NULL,
  zoom_level DECIMAL(3,2) NOT NULL DEFAULT 1.00 CHECK (zoom_level >= 0.50 AND zoom_level <= 2.00),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, rundown_id)
);

-- Enable RLS
ALTER TABLE public.user_rundown_zoom_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own zoom preferences" 
ON public.user_rundown_zoom_preferences 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updating timestamps
CREATE TRIGGER update_zoom_preferences_updated_at
BEFORE UPDATE ON public.user_rundown_zoom_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();