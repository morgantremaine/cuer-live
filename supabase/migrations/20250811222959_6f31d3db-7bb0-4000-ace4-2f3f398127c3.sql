-- COMPREHENSIVE RESTORATION: Fix shared rundowns, RLS policies, and public access
-- Phase 1: Make ALL rundowns with shared layouts public (including default layouts)
UPDATE rundowns 
SET visibility = 'public', updated_at = now()
WHERE id IN (
  SELECT DISTINCT rundown_id 
  FROM shared_rundown_layouts
);

-- Phase 2: Drop all conflicting and duplicate RLS policies on rundowns table
DROP POLICY IF EXISTS "External review access for external_notes only" ON rundowns;
DROP POLICY IF EXISTS "Team admins can delete team rundowns" ON rundowns;
DROP POLICY IF EXISTS "Team members can insert team rundowns" ON rundowns;
DROP POLICY IF EXISTS "Team members can update team rundowns" ON rundowns;
DROP POLICY IF EXISTS "Team members can view team rundowns" ON rundowns;
DROP POLICY IF EXISTS "Users can create own rundowns" ON rundowns;
DROP POLICY IF EXISTS "Users can create team rundowns" ON rundowns;
DROP POLICY IF EXISTS "Users can create their own rundowns" ON rundowns;
DROP POLICY IF EXISTS "Users can delete own rundowns" ON rundowns;
DROP POLICY IF EXISTS "Users can delete team rundowns" ON rundowns;
DROP POLICY IF EXISTS "Users can see their own rundowns and team rundowns" ON rundowns;
DROP POLICY IF EXISTS "Users can update own rundowns" ON rundowns;
DROP POLICY IF EXISTS "Users can update team rundowns" ON rundowns;
DROP POLICY IF EXISTS "Users can update their own rundowns and team rundowns they belo" ON rundowns;
DROP POLICY IF EXISTS "Users can view own rundowns" ON rundowns;
DROP POLICY IF EXISTS "Users can view team rundowns" ON rundowns;
DROP POLICY IF EXISTS "rundowns_delete_own" ON rundowns;
DROP POLICY IF EXISTS "rundowns_delete_policy" ON rundowns;
DROP POLICY IF EXISTS "rundowns_insert_policy" ON rundowns;
DROP POLICY IF EXISTS "rundowns_select_policy" ON rundowns;
DROP POLICY IF EXISTS "rundowns_update_policy" ON rundowns;
DROP POLICY IF EXISTS "users_can_access_own_and_team_rundowns" ON rundowns;

-- Phase 3: Create simple, clear RLS policies for rundowns
-- Public can view explicitly public rundowns (anonymous access)
CREATE POLICY "public_can_view_public_rundowns" ON rundowns
FOR SELECT USING (visibility = 'public');

-- Authenticated users can manage their own rundowns
CREATE POLICY "users_can_manage_own_rundowns" ON rundowns
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Team members can manage team rundowns
CREATE POLICY "team_members_can_manage_team_rundowns" ON rundowns
FOR ALL USING (
  team_id IS NOT NULL AND 
  team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  team_id IS NOT NULL AND 
  team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
);

-- External review access for external_notes updates only
CREATE POLICY "external_review_notes_access" ON rundowns
FOR UPDATE USING (visibility = 'external_review')
WITH CHECK (visibility = 'external_review');

-- Phase 4: Ensure get_public_rundown_data function works for anonymous users
CREATE OR REPLACE FUNCTION public.get_public_rundown_data(rundown_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rundown_data jsonb;
BEGIN
  -- Check if the rundown is public OR has a shared layout (either custom or default)
  IF NOT EXISTS (
    SELECT 1 
    FROM rundowns r
    WHERE r.id = rundown_uuid 
    AND (
      r.visibility = 'public' 
      OR EXISTS (
        SELECT 1 FROM shared_rundown_layouts srl 
        WHERE srl.rundown_id = r.id
      )
    )
  ) THEN
    RETURN NULL;
  END IF;
  
  -- Get the rundown data
  SELECT jsonb_build_object(
    'id', r.id,
    'title', r.title,
    'items', r.items,
    'columns', r.columns,
    'start_time', r.start_time,
    'timezone', r.timezone,
    'showcaller_state', r.showcaller_state,
    'created_at', r.created_at,
    'updated_at', r.updated_at,
    'visibility', r.visibility
  ) INTO rundown_data
  FROM rundowns r
  WHERE r.id = rundown_uuid;
  
  RETURN rundown_data;
END;
$function$;

-- Phase 5: Update shared layout function to work with both custom and default layouts
CREATE OR REPLACE FUNCTION public.get_shared_layout_for_public_rundown(rundown_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  layout_data jsonb;
BEGIN
  -- Check if the rundown exists and has a shared layout configured (or is public)
  IF NOT EXISTS (
    SELECT 1 
    FROM rundowns r
    WHERE r.id = rundown_uuid
    AND (
      r.visibility = 'public'
      OR EXISTS (
        SELECT 1 FROM shared_rundown_layouts srl 
        WHERE srl.rundown_id = r.id
      )
    )
  ) THEN
    RETURN NULL;
  END IF;
  
  -- Get the shared layout configuration for this rundown
  SELECT jsonb_build_object(
    'layout_id', srl.layout_id,
    'layout_name', CASE 
      WHEN srl.layout_id IS NULL THEN 'Default Layout'
      ELSE COALESCE(cl.name, 'Custom Layout')
    END,
    'columns', CASE 
      WHEN srl.layout_id IS NULL THEN r.columns
      ELSE COALESCE(cl.columns, r.columns, '[]'::jsonb)
    END
  ) INTO layout_data
  FROM rundowns r
  LEFT JOIN shared_rundown_layouts srl ON r.id = srl.rundown_id
  LEFT JOIN column_layouts cl ON srl.layout_id = cl.id
  WHERE r.id = rundown_uuid;
  
  RETURN layout_data;
END;
$function$;