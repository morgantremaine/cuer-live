-- Create MOS integration settings table
CREATE TABLE IF NOT EXISTS public.team_mos_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  xpression_host TEXT,
  xpression_port INTEGER DEFAULT 10540,
  mos_id TEXT NOT NULL,
  auto_take_enabled BOOLEAN DEFAULT false,
  debounce_ms INTEGER DEFAULT 1500,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  UNIQUE(team_id)
);

-- Create MOS field mapping table
CREATE TABLE IF NOT EXISTS public.team_mos_field_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  mos_integration_id UUID NOT NULL REFERENCES public.team_mos_integrations(id) ON DELETE CASCADE,
  cuer_column_key TEXT NOT NULL,
  xpression_field_name TEXT NOT NULL,
  is_template_column BOOLEAN DEFAULT false,
  field_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create MOS message log table
CREATE TABLE IF NOT EXISTS public.mos_message_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  rundown_id UUID REFERENCES public.rundowns(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL,
  message_payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create MOS connection status table
CREATE TABLE IF NOT EXISTS public.mos_connection_status (
  team_id UUID NOT NULL PRIMARY KEY REFERENCES public.teams(id) ON DELETE CASCADE,
  connected BOOLEAN NOT NULL DEFAULT false,
  xpression_host TEXT,
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_mos_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_mos_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mos_message_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mos_connection_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_mos_integrations
CREATE POLICY "Team members can view MOS integrations"
  ON public.team_mos_integrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_mos_integrations.team_id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team admins can manage MOS integrations"
  ON public.team_mos_integrations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_mos_integrations.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_mos_integrations.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
    )
  );

-- RLS Policies for team_mos_field_mappings
CREATE POLICY "Team members can view MOS field mappings"
  ON public.team_mos_field_mappings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_mos_field_mappings.team_id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team admins can manage MOS field mappings"
  ON public.team_mos_field_mappings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_mos_field_mappings.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_mos_field_mappings.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
    )
  );

-- RLS Policies for mos_message_log
CREATE POLICY "Team members can view MOS message logs"
  ON public.mos_message_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = mos_message_log.team_id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create MOS message logs"
  ON public.mos_message_log FOR INSERT
  WITH CHECK (true);

-- RLS Policies for mos_connection_status
CREATE POLICY "Team members can view MOS connection status"
  ON public.mos_connection_status FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = mos_connection_status.team_id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage MOS connection status"
  ON public.mos_connection_status FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_mos_field_mappings_team ON team_mos_field_mappings(team_id);
CREATE INDEX idx_mos_field_mappings_integration ON team_mos_field_mappings(mos_integration_id);
CREATE INDEX idx_mos_message_log_team ON mos_message_log(team_id);
CREATE INDEX idx_mos_message_log_rundown ON mos_message_log(rundown_id);
CREATE INDEX idx_mos_message_log_created ON mos_message_log(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_team_mos_integrations_updated_at
  BEFORE UPDATE ON team_mos_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_mos_updated_at();

CREATE TRIGGER update_mos_connection_status_updated_at
  BEFORE UPDATE ON mos_connection_status
  FOR EACH ROW
  EXECUTE FUNCTION update_mos_updated_at();