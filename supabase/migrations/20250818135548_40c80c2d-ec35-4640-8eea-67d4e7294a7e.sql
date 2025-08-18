-- Create showcaller_sessions table for better coordination
CREATE TABLE public.showcaller_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rundown_id UUID NOT NULL,
  controller_user_id UUID NOT NULL,
  team_id UUID NOT NULL,
  session_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_end TIMESTAMP WITH TIME ZONE,
  current_segment_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  visual_state JSONB DEFAULT '{}',
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.showcaller_sessions ENABLE ROW LEVEL SECURITY;

-- Index for performance
CREATE INDEX idx_showcaller_sessions_rundown_active ON public.showcaller_sessions(rundown_id, is_active);
CREATE INDEX idx_showcaller_sessions_controller ON public.showcaller_sessions(controller_user_id, is_active);
CREATE INDEX idx_showcaller_sessions_team ON public.showcaller_sessions(team_id, is_active);

-- RLS policies
CREATE POLICY "Team members can view team showcaller sessions"
ON public.showcaller_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.team_id = showcaller_sessions.team_id 
    AND team_members.user_id = auth.uid()
  )
);

CREATE POLICY "Team members can create showcaller sessions"
ON public.showcaller_sessions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.team_id = showcaller_sessions.team_id 
    AND team_members.user_id = auth.uid()
  )
  AND controller_user_id = auth.uid()
);

CREATE POLICY "Controllers can update their own sessions"
ON public.showcaller_sessions
FOR UPDATE
USING (controller_user_id = auth.uid());

CREATE POLICY "Team members can end showcaller sessions"
ON public.showcaller_sessions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.team_id = showcaller_sessions.team_id 
    AND team_members.user_id = auth.uid()
  )
);

-- Function to end inactive sessions
CREATE OR REPLACE FUNCTION public.cleanup_inactive_showcaller_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- End sessions that haven't been active for more than 5 minutes
  UPDATE public.showcaller_sessions
  SET is_active = false,
      session_end = now(),
      updated_at = now()
  WHERE is_active = true
  AND last_activity < now() - interval '5 minutes';
END;
$$;

-- Create update timestamp trigger
CREATE TRIGGER update_showcaller_sessions_updated_at
  BEFORE UPDATE ON public.showcaller_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();