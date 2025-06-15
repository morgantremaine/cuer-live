
-- Create user_column_preferences table for per-user column settings
CREATE TABLE public.user_column_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rundown_id UUID NOT NULL REFERENCES public.rundowns(id) ON DELETE CASCADE,
  column_layout JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, rundown_id)
);

-- Create shared_rundown_layouts table for tracking shared rundown layout selections
CREATE TABLE public.shared_rundown_layouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rundown_id UUID NOT NULL REFERENCES public.rundowns(id) ON DELETE CASCADE,
  layout_id UUID REFERENCES public.column_layouts(id) ON DELETE SET NULL,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(rundown_id)
);

-- Add RLS policies for user_column_preferences
ALTER TABLE public.user_column_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own column preferences" 
  ON public.user_column_preferences 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own column preferences" 
  ON public.user_column_preferences 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own column preferences" 
  ON public.user_column_preferences 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own column preferences" 
  ON public.user_column_preferences 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add RLS policies for shared_rundown_layouts
ALTER TABLE public.shared_rundown_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view shared rundown layouts" 
  ON public.shared_rundown_layouts 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.rundowns r
      JOIN public.team_members tm ON tm.team_id = r.team_id
      WHERE r.id = shared_rundown_layouts.rundown_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create shared rundown layouts" 
  ON public.shared_rundown_layouts 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rundowns r
      JOIN public.team_members tm ON tm.team_id = r.team_id
      WHERE r.id = shared_rundown_layouts.rundown_id
      AND tm.user_id = auth.uid()
    )
    AND auth.uid() = shared_by
  );

CREATE POLICY "Team members can update shared rundown layouts" 
  ON public.shared_rundown_layouts 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.rundowns r
      JOIN public.team_members tm ON tm.team_id = r.team_id
      WHERE r.id = shared_rundown_layouts.rundown_id
      AND tm.user_id = auth.uid()
    )
  );

-- Update column_layouts table to be user-specific if not already
-- (This table already exists, just ensuring it has proper user association)
