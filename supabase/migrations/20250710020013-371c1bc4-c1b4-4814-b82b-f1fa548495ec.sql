-- Create team_integrations table for webhook and OSC endpoints
CREATE TABLE public.team_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  name TEXT NOT NULL,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('webhook', 'osc')),
  
  -- HTTP/Webhook fields
  endpoint_url TEXT,
  http_method TEXT DEFAULT 'POST' CHECK (http_method IN ('POST', 'PUT', 'PATCH')),
  auth_headers JSONB DEFAULT '{}',
  custom_headers JSONB DEFAULT '{}',
  
  -- OSC fields  
  osc_host TEXT,
  osc_port INTEGER,
  osc_path TEXT DEFAULT '/cue',
  
  -- Configuration
  is_active BOOLEAN DEFAULT true,
  rate_limit_per_minute INTEGER DEFAULT 60,
  retry_attempts INTEGER DEFAULT 3,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create team_api_keys table for external system authentication
CREATE TABLE public.team_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  permissions JSONB DEFAULT '["read"]',
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create cue_logs table for debugging and monitoring
CREATE TABLE public.cue_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rundown_id UUID NOT NULL,
  team_id UUID NOT NULL,
  integration_id UUID,
  
  -- Cue context
  segment_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  
  -- Request details
  payload JSONB NOT NULL,
  endpoint_url TEXT,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  
  -- Timing
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  response_time_ms INTEGER
);

-- Enable Row Level Security
ALTER TABLE public.team_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cue_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_integrations
CREATE POLICY "Team members can view team integrations" 
ON public.team_integrations 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM team_members 
  WHERE team_members.team_id = team_integrations.team_id 
  AND team_members.user_id = auth.uid()
));

CREATE POLICY "Team members can create team integrations" 
ON public.team_integrations 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM team_members 
  WHERE team_members.team_id = team_integrations.team_id 
  AND team_members.user_id = auth.uid()
) AND created_by = auth.uid());

CREATE POLICY "Team members can update team integrations" 
ON public.team_integrations 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM team_members 
  WHERE team_members.team_id = team_integrations.team_id 
  AND team_members.user_id = auth.uid()
));

CREATE POLICY "Team members can delete team integrations" 
ON public.team_integrations 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM team_members 
  WHERE team_members.team_id = team_integrations.team_id 
  AND team_members.user_id = auth.uid()
));

-- RLS Policies for team_api_keys
CREATE POLICY "Team members can view team API keys" 
ON public.team_api_keys 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM team_members 
  WHERE team_members.team_id = team_api_keys.team_id 
  AND team_members.user_id = auth.uid()
));

CREATE POLICY "Team members can create team API keys" 
ON public.team_api_keys 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM team_members 
  WHERE team_members.team_id = team_api_keys.team_id 
  AND team_members.user_id = auth.uid()
) AND created_by = auth.uid());

CREATE POLICY "Team members can update team API keys" 
ON public.team_api_keys 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM team_members 
  WHERE team_members.team_id = team_api_keys.team_id 
  AND team_members.user_id = auth.uid()
));

CREATE POLICY "Team members can delete team API keys" 
ON public.team_api_keys 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM team_members 
  WHERE team_members.team_id = team_api_keys.team_id 
  AND team_members.user_id = auth.uid()
));

-- RLS Policies for cue_logs
CREATE POLICY "Team members can view team cue logs" 
ON public.cue_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM team_members 
  WHERE team_members.team_id = cue_logs.team_id 
  AND team_members.user_id = auth.uid()
));

CREATE POLICY "System can create cue logs" 
ON public.cue_logs 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_team_integrations_team_id ON public.team_integrations(team_id);
CREATE INDEX idx_team_integrations_active ON public.team_integrations(team_id, is_active);
CREATE INDEX idx_team_api_keys_team_id ON public.team_api_keys(team_id);
CREATE INDEX idx_team_api_keys_key ON public.team_api_keys(api_key) WHERE is_active = true;
CREATE INDEX idx_cue_logs_team_id ON public.cue_logs(team_id);
CREATE INDEX idx_cue_logs_rundown_id ON public.cue_logs(rundown_id);
CREATE INDEX idx_cue_logs_sent_at ON public.cue_logs(sent_at DESC);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for team_integrations
CREATE TRIGGER update_team_integrations_updated_at
BEFORE UPDATE ON public.team_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();