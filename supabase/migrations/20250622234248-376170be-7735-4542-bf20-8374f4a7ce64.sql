
-- Create rundown_folders table for custom folders
CREATE TABLE public.rundown_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Add folder_id to rundowns table (nullable - null means "All Rundowns")
ALTER TABLE public.rundowns 
ADD COLUMN folder_id UUID REFERENCES public.rundown_folders(id) ON DELETE SET NULL;

-- Enable RLS on rundown_folders
ALTER TABLE public.rundown_folders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for rundown_folders
CREATE POLICY "Team members can view team folders" 
  ON public.rundown_folders 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = rundown_folders.team_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create folders for their team" 
  ON public.rundown_folders 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = rundown_folders.team_id 
      AND user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Team members can update team folders" 
  ON public.rundown_folders 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = rundown_folders.team_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can delete team folders" 
  ON public.rundown_folders 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = rundown_folders.team_id 
      AND user_id = auth.uid()
    )
  );

-- Create index for better performance
CREATE INDEX idx_rundown_folders_team_id ON public.rundown_folders(team_id);
CREATE INDEX idx_rundowns_folder_id ON public.rundowns(folder_id);
