import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle, Send } from 'lucide-react';

interface MOSIntegration {
  id: string;
  mos_id: string;
  xpression_host: string | null;
  xpression_port: number | null;
  enabled: boolean;
}

interface RundownMOSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rundownId: string;
  teamId: string;
}

export function RundownMOSDialog({ open, onOpenChange, rundownId, teamId }: RundownMOSDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  
  const [mosEnabled, setMosEnabled] = useState(false);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null);
  const [teamIntegrations, setTeamIntegrations] = useState<MOSIntegration[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    error_message: string | null;
    last_heartbeat: string | null;
  } | null>(null);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, rundownId, teamId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch rundown MOS settings
      const { data: rundownData, error: rundownError } = await supabase
        .from('rundowns')
        .select('mos_enabled, mos_integration_id')
        .eq('id', rundownId)
        .single();

      if (rundownError) throw rundownError;

      setMosEnabled(rundownData?.mos_enabled || false);
      setSelectedIntegrationId(rundownData?.mos_integration_id || null);

      // Fetch team integrations
      const { data: integrations, error: integrationsError } = await supabase
        .from('team_mos_integrations')
        .select('id, mos_id, xpression_host, xpression_port, enabled')
        .eq('team_id', teamId);

      if (integrationsError) throw integrationsError;

      setTeamIntegrations(integrations || []);

      // If no integration selected but one exists, auto-select it
      if (!rundownData?.mos_integration_id && integrations && integrations.length > 0) {
        setSelectedIntegrationId(integrations[0].id);
      }

      // Fetch connection status
      const { data: statusData, error: statusError } = await supabase
        .from('mos_connection_status')
        .select('connected, error_message, last_heartbeat')
        .eq('team_id', teamId)
        .single();

      if (!statusError) {
        setConnectionStatus(statusData);
      }
    } catch (error) {
      console.error('Error fetching MOS data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load MOS settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('rundowns')
        .update({
          mos_enabled: mosEnabled,
          mos_integration_id: selectedIntegrationId,
        })
        .eq('id', rundownId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'MOS settings saved successfully',
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving MOS settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save MOS settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestSend = async () => {
    if (!selectedIntegrationId) {
      toast({
        title: 'Error',
        description: 'Please select a MOS integration first',
        variant: 'destructive',
      });
      return;
    }

    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('mos-send-message', {
        body: {
          teamId,
          rundownId,
          eventType: 'TEST',
          segmentId: 'test-segment',
          segmentData: { name: 'Test Message' },
        },
      });

      if (error) throw error;

      toast({
        title: 'Test Successful',
        description: 'Test message sent successfully to Xpression',
      });
    } catch (error: any) {
      console.error('Test send failed:', error);
      toast({
        title: 'Test Failed',
        description: error.message || 'Failed to send test message',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const selectedIntegration = teamIntegrations.find(i => i.id === selectedIntegrationId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>MOS/Xpression Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="mos-enabled">Enable MOS for this rundown</Label>
              <p className="text-sm text-muted-foreground">
                Send real-time updates to Xpression graphics system
              </p>
            </div>
            <Switch
              id="mos-enabled"
              checked={mosEnabled}
              onCheckedChange={setMosEnabled}
            />
          </div>

          {/* Integration Selection */}
          {teamIntegrations.length > 0 ? (
            <div className="space-y-2">
              <Label>MOS Integration</Label>
              <Select value={selectedIntegrationId || undefined} onValueChange={setSelectedIntegrationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a MOS integration" />
                </SelectTrigger>
                <SelectContent>
                  {teamIntegrations.map((integration) => (
                    <SelectItem key={integration.id} value={integration.id}>
                      {integration.mos_id} - {integration.xpression_host}:{integration.xpression_port}
                      {!integration.enabled && ' (Disabled)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                No MOS integrations configured for this team. Go to Team Settings → Integrations to set one up.
              </p>
            </div>
          )}

          {/* Connection Status */}
          {selectedIntegration && (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <h4 className="text-sm font-medium">Connection Status</h4>
              <div className="flex items-center gap-2">
                {connectionStatus?.connected ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-foreground">Connected</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-destructive">Disconnected</span>
                  </>
                )}
              </div>
              {connectionStatus?.error_message && (
                <p className="text-xs text-destructive">{connectionStatus.error_message}</p>
              )}
              {connectionStatus?.last_heartbeat && (
                <p className="text-xs text-muted-foreground">
                  Last heartbeat: {new Date(connectionStatus.last_heartbeat).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Test Button */}
          {selectedIntegration && mosEnabled && (
            <Button
              variant="outline"
              onClick={handleTestSend}
              disabled={testing || !selectedIntegration.enabled}
              className="w-full"
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Test...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Test Message
                </>
              )}
            </Button>
          )}

          {/* Save Button */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
