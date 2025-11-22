-- Add MOS configuration fields to rundowns table
ALTER TABLE rundowns 
ADD COLUMN mos_enabled boolean DEFAULT false,
ADD COLUMN mos_integration_id uuid REFERENCES team_mos_integrations(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_rundowns_mos_integration ON rundowns(mos_integration_id) WHERE mos_integration_id IS NOT NULL;

COMMENT ON COLUMN rundowns.mos_enabled IS 'Whether MOS/Xpression integration is enabled for this specific rundown';
COMMENT ON COLUMN rundowns.mos_integration_id IS 'Reference to the team MOS integration configuration to use for this rundown';