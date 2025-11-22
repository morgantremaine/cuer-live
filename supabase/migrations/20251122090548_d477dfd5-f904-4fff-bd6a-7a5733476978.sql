-- Add MOS configuration fields directly to rundowns table
ALTER TABLE rundowns 
  ADD COLUMN IF NOT EXISTS mos_id TEXT DEFAULT 'CUER_MOS_01',
  ADD COLUMN IF NOT EXISTS mos_xpression_host TEXT,
  ADD COLUMN IF NOT EXISTS mos_xpression_port INTEGER DEFAULT 6000,
  ADD COLUMN IF NOT EXISTS mos_debounce_ms INTEGER DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS mos_auto_take_enabled BOOLEAN DEFAULT false;

-- Create rundown-level field mappings table
CREATE TABLE IF NOT EXISTS rundown_mos_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rundown_id UUID NOT NULL REFERENCES rundowns(id) ON DELETE CASCADE,
  cuer_column_key TEXT NOT NULL,
  xpression_field_name TEXT NOT NULL,
  field_order INTEGER DEFAULT 0,
  is_template_column BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies for rundown_mos_field_mappings
ALTER TABLE rundown_mos_field_mappings ENABLE ROW LEVEL SECURITY;

-- Team members can manage field mappings for team rundowns
CREATE POLICY "Team members can manage rundown MOS mappings"
ON rundown_mos_field_mappings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM rundowns r
    JOIN team_members tm ON tm.team_id = r.team_id
    WHERE r.id = rundown_mos_field_mappings.rundown_id AND tm.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rundowns r
    JOIN team_members tm ON tm.team_id = r.team_id
    WHERE r.id = rundown_mos_field_mappings.rundown_id AND tm.user_id = auth.uid()
  )
);

-- Update mos_connection_status to be rundown-specific
ALTER TABLE mos_connection_status 
  ADD COLUMN IF NOT EXISTS rundown_id UUID REFERENCES rundowns(id) ON DELETE CASCADE;

-- Drop the old team_id primary key constraint and add composite key
ALTER TABLE mos_connection_status DROP CONSTRAINT IF EXISTS mos_connection_status_pkey;
ALTER TABLE mos_connection_status ADD PRIMARY KEY (team_id, rundown_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rundown_mos_field_mappings_rundown_id 
  ON rundown_mos_field_mappings(rundown_id);

-- Migrate existing team MOS settings to rundowns that have mos_enabled=true
-- Copy team integration settings to rundowns
UPDATE rundowns r
SET 
  mos_id = tmi.mos_id,
  mos_xpression_host = tmi.xpression_host,
  mos_xpression_port = tmi.xpression_port,
  mos_debounce_ms = tmi.debounce_ms,
  mos_auto_take_enabled = tmi.auto_take_enabled
FROM team_mos_integrations tmi
WHERE r.mos_integration_id = tmi.id 
  AND r.mos_enabled = true
  AND tmi.enabled = true;

-- Migrate field mappings to rundown-level
INSERT INTO rundown_mos_field_mappings (rundown_id, cuer_column_key, xpression_field_name, field_order, is_template_column)
SELECT 
  r.id as rundown_id,
  tmfm.cuer_column_key,
  tmfm.xpression_field_name,
  tmfm.field_order,
  tmfm.is_template_column
FROM rundowns r
JOIN team_mos_integrations tmi ON r.mos_integration_id = tmi.id
JOIN team_mos_field_mappings tmfm ON tmfm.mos_integration_id = tmi.id AND tmfm.team_id = r.team_id
WHERE r.mos_enabled = true
  AND tmi.enabled = true
ON CONFLICT DO NOTHING;

-- Remove the old mos_integration_id column (after migration)
ALTER TABLE rundowns DROP COLUMN IF EXISTS mos_integration_id;