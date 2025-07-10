-- Add RLS policy to allow team members to delete their team's cue logs
CREATE POLICY "Team members can delete team cue logs" 
ON public.cue_logs 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.team_id = cue_logs.team_id 
    AND team_members.user_id = auth.uid()
  )
);