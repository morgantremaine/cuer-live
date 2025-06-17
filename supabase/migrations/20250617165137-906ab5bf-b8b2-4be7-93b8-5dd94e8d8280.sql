
-- Add team_id column to column_layouts table
ALTER TABLE public.column_layouts 
ADD COLUMN team_id uuid REFERENCES public.teams(id);

-- Create index for efficient team-based queries
CREATE INDEX idx_column_layouts_team_id ON public.column_layouts(team_id);

-- Create function to get user's team IDs for RLS policies
CREATE OR REPLACE FUNCTION public.get_user_team_ids_for_layouts(user_uuid uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT ARRAY(
    SELECT team_id FROM team_members 
    WHERE user_id = user_uuid
  );
$$;

-- Drop existing RLS policies on column_layouts
DROP POLICY IF EXISTS "Users can view own layouts" ON public.column_layouts;
DROP POLICY IF EXISTS "Users can insert own layouts" ON public.column_layouts;
DROP POLICY IF EXISTS "Users can update own layouts" ON public.column_layouts;
DROP POLICY IF EXISTS "Users can delete own layouts" ON public.column_layouts;

-- Enable RLS on column_layouts if not already enabled
ALTER TABLE public.column_layouts ENABLE ROW LEVEL SECURITY;

-- Create new RLS policies for team-based access
CREATE POLICY "Users can view team layouts" 
  ON public.column_layouts 
  FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    team_id = ANY(public.get_user_team_ids_for_layouts(auth.uid()))
  );

CREATE POLICY "Users can create layouts for their teams" 
  ON public.column_layouts 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND
    (team_id IS NULL OR team_id = ANY(public.get_user_team_ids_for_layouts(auth.uid())))
  );

CREATE POLICY "Users can update their own layouts" 
  ON public.column_layouts 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own layouts" 
  ON public.column_layouts 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Migrate existing layouts to include team_id from user's first team
UPDATE public.column_layouts 
SET team_id = (
  SELECT team_id 
  FROM public.team_members 
  WHERE user_id = column_layouts.user_id 
  LIMIT 1
)
WHERE team_id IS NULL;
