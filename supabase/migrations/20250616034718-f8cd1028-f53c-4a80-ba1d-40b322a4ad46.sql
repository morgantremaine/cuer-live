
-- Update RLS policies for shared_rundown_layouts to allow public read access for public rundowns
CREATE POLICY "Public can view shared layouts for public rundowns" 
  ON public.shared_rundown_layouts 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.rundowns r
      WHERE r.id = shared_rundown_layouts.rundown_id
      AND r.visibility = 'public'
    )
  );

-- Update RLS policies for column_layouts to allow public read access when used by shared rundowns
CREATE POLICY "Public can view layouts used by public rundowns" 
  ON public.column_layouts 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_rundown_layouts srl
      JOIN public.rundowns r ON r.id = srl.rundown_id
      WHERE srl.layout_id = column_layouts.id
      AND r.visibility = 'public'
    )
  );
