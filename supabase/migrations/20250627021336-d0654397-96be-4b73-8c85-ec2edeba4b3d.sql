
-- Create team_custom_columns table to track custom columns shared across team members
CREATE TABLE public.team_custom_columns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid NOT NULL,
  column_key text NOT NULL,
  column_name text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(team_id, column_key)
);

-- Enable RLS
ALTER TABLE public.team_custom_columns ENABLE ROW LEVEL SECURITY;

-- Create policy for team members to view team columns
CREATE POLICY "Team members can view team custom columns" 
  ON public.team_custom_columns 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = team_custom_columns.team_id 
      AND team_members.user_id = auth.uid()
    )
  );

-- Create policy for team members to create team columns
CREATE POLICY "Team members can create team custom columns" 
  ON public.team_custom_columns 
  FOR INSERT 
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = team_custom_columns.team_id 
      AND team_members.user_id = auth.uid()
    )
  );

-- Create policy for creators to update their columns
CREATE POLICY "Users can update their own team custom columns" 
  ON public.team_custom_columns 
  FOR UPDATE 
  USING (created_by = auth.uid());

-- Create policy for creators to delete their columns
CREATE POLICY "Users can delete their own team custom columns" 
  ON public.team_custom_columns 
  FOR DELETE 
  USING (created_by = auth.uid());

-- Create function to get team custom columns
CREATE OR REPLACE FUNCTION public.get_team_custom_columns(team_uuid uuid)
RETURNS TABLE(
  id uuid,
  column_key text,
  column_name text,
  created_by uuid,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tcc.id, tcc.column_key, tcc.column_name, tcc.created_by, tcc.created_at
  FROM team_custom_columns tcc
  WHERE tcc.team_id = team_uuid
  ORDER BY tcc.created_at;
$$;

-- Create function to sync existing custom columns to team table
CREATE OR REPLACE FUNCTION public.migrate_existing_custom_columns()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rundown_record RECORD;
  column_record RECORD;
  custom_column jsonb;
BEGIN
  -- Loop through all rundowns with custom columns
  FOR rundown_record IN 
    SELECT id, team_id, user_id, columns
    FROM rundowns 
    WHERE columns IS NOT NULL AND team_id IS NOT NULL
  LOOP
    -- Extract custom columns from the rundown's columns jsonb
    IF rundown_record.columns ? 'columns' THEN
      FOR column_record IN 
        SELECT * FROM jsonb_array_elements(rundown_record.columns->'columns') AS col
        WHERE (col->>'isCustom')::boolean = true
      LOOP
        -- Insert into team_custom_columns if doesn't exist
        INSERT INTO team_custom_columns (team_id, column_key, column_name, created_by)
        VALUES (
          rundown_record.team_id,
          column_record.col->>'key',
          column_record.col->>'name',
          rundown_record.user_id
        )
        ON CONFLICT (team_id, column_key) DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

-- Enable realtime for team_custom_columns
ALTER TABLE public.team_custom_columns REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_custom_columns;
