-- Create normalized rundown_items table for per-row persistence
CREATE TABLE public.rundown_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rundown_id UUID NOT NULL,
  item_id TEXT NOT NULL, -- The original item.id from the JSON
  item_index INTEGER NOT NULL, -- Position in the rundown
  item_data JSONB NOT NULL, -- The full item object
  item_version INTEGER NOT NULL DEFAULT 1, -- Per-item version for conflict resolution
  last_edited_by UUID, -- Who last edited this item
  last_edited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure uniqueness per rundown
  UNIQUE(rundown_id, item_id),
  UNIQUE(rundown_id, item_index)
);

-- Enable RLS
ALTER TABLE public.rundown_items ENABLE ROW LEVEL SECURITY;

-- Create policies for rundown_items (same access as rundowns)
CREATE POLICY "Team members can view team rundown items" 
ON public.rundown_items 
FOR SELECT 
USING (
  rundown_id IN (
    SELECT r.id FROM rundowns r
    WHERE (r.team_id IS NOT NULL AND r.team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can view own rundown items" 
ON public.rundown_items 
FOR SELECT 
USING (
  rundown_id IN (
    SELECT id FROM rundowns WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Team members can modify team rundown items" 
ON public.rundown_items 
FOR ALL 
USING (
  rundown_id IN (
    SELECT r.id FROM rundowns r
    WHERE (r.team_id IS NOT NULL AND r.team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can modify own rundown items" 
ON public.rundown_items 
FOR ALL 
USING (
  rundown_id IN (
    SELECT id FROM rundowns WHERE user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_rundown_items_rundown_id ON public.rundown_items(rundown_id);
CREATE INDEX idx_rundown_items_item_index ON public.rundown_items(rundown_id, item_index);
CREATE INDEX idx_rundown_items_updated_at ON public.rundown_items(updated_at);

-- Create trigger for updating timestamps
CREATE TRIGGER update_rundown_items_updated_at
  BEFORE UPDATE ON public.rundown_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to migrate existing rundown items to normalized table
CREATE OR REPLACE FUNCTION public.migrate_rundown_to_normalized_items(target_rundown_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  rundown_data RECORD;
  item_record JSONB;
  item_index INTEGER := 0;
  items_migrated INTEGER := 0;
BEGIN
  -- Get the rundown data
  SELECT items INTO rundown_data FROM rundowns WHERE id = target_rundown_id;
  
  IF rundown_data IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Clear existing normalized items for this rundown
  DELETE FROM rundown_items WHERE rundown_id = target_rundown_id;
  
  -- Insert each item as a separate row
  FOR item_record IN SELECT * FROM jsonb_array_elements(rundown_data.items)
  LOOP
    INSERT INTO rundown_items (
      rundown_id,
      item_id,
      item_index,
      item_data,
      item_version,
      last_edited_by,
      last_edited_at
    ) VALUES (
      target_rundown_id,
      item_record->>'id',
      item_index,
      item_record,
      1,
      auth.uid(),
      now()
    );
    
    item_index := item_index + 1;
    items_migrated := items_migrated + 1;
  END LOOP;
  
  RETURN items_migrated;
END;
$$;

-- Function to reconstruct rundown items array from normalized table
CREATE OR REPLACE FUNCTION public.get_rundown_items_array(target_rundown_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    jsonb_agg(item_data ORDER BY item_index),
    '[]'::jsonb
  )
  FROM rundown_items 
  WHERE rundown_id = target_rundown_id;
$$;