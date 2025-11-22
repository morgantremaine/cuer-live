import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Activity, Settings, Trash2, Plus, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MOSFieldMapping } from './MOSFieldMapping';
import { MOSDebugPanel } from './MOSDebugPanel';

interface MOSIntegration {
  id: string;
  mos_id: string;
  xpression_host: string | null;
  xpression_port: number | null;
  enabled: boolean;
  auto_take_enabled: boolean;
  debounce_ms: number;
  created_at: string;
  updated_at: string;
}

interface MOSConnectionStatus {
  connected: boolean;
  last_heartbeat: string | null;
  error_message: string | null;
  xpression_host: string | null;
}

interface MOSSettingsProps {
  teamId: string;
}

export const MOSSettings: React.FC<MOSSettingsProps> = ({ teamId }) => {
  const [integration, setIntegration] = useState<MOSIntegration | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<MOSConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    mosId: 'CUER_MOS_01',
    xpressionHost: '',
    xpressionPort: 6000,
    enabled: false,
    autoTakeEnabled: false,
    debounceMs: 1000,
  });

  useEffect(() => {
    fetchMOSData();
    // Poll connection status every 10 seconds
    const interval = setInterval(fetchConnectionStatus, 10000);
    return () => clearInterval(interval);
  }, [teamId]);

  const fetchMOSData = async () => {
    try {
      setLoading(true);
      
      // Fetch MOS integration
      const { data: mosData, error: mosError } = await supabase
        .from('team_mos_integrations')
        .select('*')
        .eq('team_id', teamId)
        .single();

      if (mosError && mosError.code !== 'PGRST116') throw mosError;

      if (mosData) {
        setIntegration(mosData);
        setFormData({
          mosId: mosData.mos_id || 'CUER_MOS_01',
          xpressionHost: mosData.xpression_host || '',
          xpressionPort: mosData.xpression_port || 6000,
          enabled: mosData.enabled || false,
          autoTakeEnabled: mosData.auto_take_enabled || false,
          debounceMs: mosData.debounce_ms || 1000,
        });
      }

      await fetchConnectionStatus();
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

  const fetchConnectionStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('mos_connection_status')
        .select('*')
        .eq('team_id', teamId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setConnectionStatus(data);
    } catch (error) {
      console.error('Error fetching connection status:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const mosData = {
        team_id: teamId,
        mos_id: formData.mosId,
        xpression_host: formData.xpressionHost,
        xpression_port: formData.xpressionPort,
        enabled: formData.enabled,
        auto_take_enabled: formData.autoTakeEnabled,
        debounce_ms: formData.debounceMs,
        created_by: user.id,
      };

      if (integration) {
        // Update existing
        const { error } = await supabase
          .from('team_mos_integrations')
          .update(mosData)
          .eq('id', integration.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('team_mos_integrations')
          .insert(mosData);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'MOS integration settings saved',
      });

      await fetchMOSData();
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

  const handleDelete = async () => {
    if (!integration || !confirm('Are you sure you want to delete this MOS integration?')) return;

    try {
      const { error } = await supabase
        .from('team_mos_integrations')
        .delete()
        .eq('id', integration.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'MOS integration deleted',
      });

      setIntegration(null);
      setFormData({
        mosId: 'CUER_MOS_01',
        xpressionHost: '',
        xpressionPort: 6000,
        enabled: false,
        autoTakeEnabled: false,
        debounceMs: 1000,
      });
    } catch (error) {
      console.error('Error deleting MOS integration:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete MOS integration',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading MOS settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                MOS/Xpression Connection
              </CardTitle>
              <CardDescription>
                Configure MOS protocol integration with Ross Xpression
              </CardDescription>
            </div>
            {connectionStatus && (
              <Badge variant={connectionStatus.connected ? 'default' : 'destructive'}>
                {connectionStatus.connected ? 'Connected' : 'Disconnected'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {connectionStatus && !connectionStatus.connected && connectionStatus.error_message && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
              <div className="text-sm text-destructive">{connectionStatus.error_message}</div>
            </div>
          )}
          
          {connectionStatus?.last_heartbeat && (
            <div className="text-sm text-muted-foreground mb-4">
              Last heartbeat: {new Date(connectionStatus.last_heartbeat).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            MOS Configuration
          </CardTitle>
          <CardDescription>
            Configure connection settings and behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mosId">MOS ID</Label>
              <Input
                id="mosId"
                value={formData.mosId}
                onChange={(e) => setFormData({ ...formData, mosId: e.target.value })}
                placeholder="CUER_MOS_01"
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier for this MOS device
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="debounceMs">Debounce (ms)</Label>
              <Input
                id="debounceMs"
                type="number"
                value={formData.debounceMs}
                onChange={(e) => setFormData({ ...formData, debounceMs: parseInt(e.target.value) })}
                min={0}
                max={5000}
              />
              <p className="text-xs text-muted-foreground">
                Delay before sending updates
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="xpressionHost">Xpression Host</Label>
            <Input
              id="xpressionHost"
              value={formData.xpressionHost}
              onChange={(e) => setFormData({ ...formData, xpressionHost: e.target.value })}
              placeholder="192.168.1.100"
            />
            <p className="text-xs text-muted-foreground">
              IP address of Ross Xpression system
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="xpressionPort">Xpression Port</Label>
            <Input
              id="xpressionPort"
              type="number"
              value={formData.xpressionPort}
              onChange={(e) => setFormData({ ...formData, xpressionPort: parseInt(e.target.value) })}
              placeholder="6000"
            />
            <p className="text-xs text-muted-foreground">
              MOS port (typically 6000)
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable MOS Integration</Label>
              <p className="text-xs text-muted-foreground">
                Send MOS messages to Xpression
              </p>
            </div>
            <Switch
              checked={formData.enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Take Enabled</Label>
              <p className="text-xs text-muted-foreground">
                Automatically take graphics on air
              </p>
            </div>
            <Switch
              checked={formData.autoTakeEnabled}
              onCheckedChange={(checked) => setFormData({ ...formData, autoTakeEnabled: checked })}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? 'Saving...' : integration ? 'Update Configuration' : 'Create Configuration'}
            </Button>
            {integration && (
              <Button onClick={handleDelete} variant="destructive" size="icon">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Field Mapping */}
      {integration && (
        <MOSFieldMapping teamId={teamId} mosIntegrationId={integration.id} />
      )}

      {/* Debug Panel */}
      <MOSDebugPanel teamId={teamId} />
    </div>
  );
};
