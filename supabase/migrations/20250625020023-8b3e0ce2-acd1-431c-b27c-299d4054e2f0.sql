
-- First, let's see what policies exist on column_layouts
-- The issue is that RLS is preventing access to layouts for anonymous users
-- We need to allow access to layouts that are specifically shared through shared_rundown_layouts

-- Create a security definer function to check if a layout is shared for a public rundown
CREATE OR REPLACE FUNCTION public.is_layout_shared_for_public_rundown(layout_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM shared_rundown_layouts srl
    JOIN rundowns r ON r.id = srl.rundown_id
    WHERE srl.layout_id = layout_uuid
    AND (r.visibility = 'public' OR r.visibility IS NULL)
  );
$$;

-- Add a new policy to allow access to layouts that are shared for public rundowns
CREATE POLICY "Public access to shared layouts for public rundowns" 
  ON public.column_layouts 
  FOR SELECT 
  USING (public.is_layout_shared_for_public_rundown(id));
