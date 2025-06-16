
-- Check if the policies exist and update them to work properly
DROP POLICY IF EXISTS "Public can view shared layouts for public rundowns" ON public.shared_rundown_layouts;
DROP POLICY IF EXISTS "Public can view layouts used by public rundowns" ON public.column_layouts;
DROP POLICY IF EXISTS "Public can view public rundowns" ON public.rundowns;

-- Create updated policy for shared_rundown_layouts that allows anonymous access for public rundowns
CREATE POLICY "Public can view shared layouts for public rundowns" 
  ON public.shared_rundown_layouts 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.rundowns r
      WHERE r.id = shared_rundown_layouts.rundown_id
      AND (r.visibility = 'public' OR r.visibility IS NULL)
    )
  );

-- Create updated policy for column_layouts that allows anonymous access when used by public rundowns
CREATE POLICY "Public can view layouts used by public rundowns" 
  ON public.column_layouts 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_rundown_layouts srl
      JOIN public.rundowns r ON r.id = srl.rundown_id
      WHERE srl.layout_id = column_layouts.id
      AND (r.visibility = 'public' OR r.visibility IS NULL)
    )
  );

-- Create policy for rundowns table to allow public access for anonymous users
CREATE POLICY "Public can view public rundowns" 
  ON public.rundowns 
  FOR SELECT 
  USING (visibility = 'public' OR visibility IS NULL);
