-- Drop the existing policy
DROP POLICY IF EXISTS "Allow access to layouts for shared rundowns and team members" ON column_layouts;

-- Create updated policy with team member visibility for personal layouts
CREATE POLICY "Allow access to layouts for shared rundowns and team members"
ON column_layouts
FOR SELECT
USING (
  -- Existing: Layout is used in a shared rundown
  (EXISTS (
    SELECT 1 FROM shared_rundown_layouts srl
    JOIN rundowns r ON r.id = srl.rundown_id
    WHERE srl.layout_id = column_layouts.id
  ))
  OR
  -- Existing: Authenticated user conditions
  (auth.uid() IS NOT NULL AND (
    -- User owns the layout
    user_id = auth.uid()
    OR
    -- Layout is a team layout and user is in that team
    (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.user_id = auth.uid()
      AND team_members.team_id = column_layouts.team_id
    ))
    OR
    -- NEW: Personal layout and owner shares a team with current user
    (team_id IS NULL AND EXISTS (
      SELECT 1 FROM team_members tm1
      JOIN team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.user_id = auth.uid()
      AND tm2.user_id = column_layouts.user_id
    ))
  ))
);