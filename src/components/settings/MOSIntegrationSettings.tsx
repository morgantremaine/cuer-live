import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import MOSFieldMapper from './MOSFieldMapper';

interface MOSIntegrationSettingsProps {
  teamId: string;
}

interface MOSIntegration {
  id: string;
  enabled: boolean;
  xpression_host: string;
  xpression_port: number;
  mos_id: string;
  auto_take_enabled: boolean;
  debounce_ms: number;
}

const MOSIntegrationSettings: React.FC<MOSIntegrationSettingsProps> = ({ teamId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [integration, setIntegration] = useState<MOSIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('disconnected');

  // Feature flag check
  const isFeatureEnabled = user?.email === 'morgan@cuer.live';

  useEffect(() => {
    if (isFeatureEnabled) {
      fetchIntegration();
      subscribeToConnectionStatus();
    }
  }, [teamId, isFeatureEnabled]);

  const fetchIntegration = async () => {
    try {
      const { data, error } = await supabase
        .from('team_mos_integrations')
        .select('*')
        .eq('team_id', teamId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setIntegration(data);
      } else {
        // Create default integration
        const defaultMosId = `cuer.${teamId}.${Date.now()}`;
        const { data: newIntegration, error: createError } = await supabase
          .from('team_mos_integrations')
          .insert({
            team_id: teamId,
            enabled: false,
            mos_id: defaultMosId,
            created_by: user?.id,
          })
          .select()
          .single();

        if (createError) throw createError;
        setIntegration(newIntegration);
      }
    } catch (error) {
      console.error('Error fetching MOS integration:', error);
      toast({
        title: 'Error',
        description: 'Failed to load MOS integration settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToConnectionStatus = () => {
    const channel = supabase
      .channel('mos-connection-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mos_connection_status',
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          const status = payload.new as any;
          setConnectionStatus(status?.connected ? 'connected' : 'disconnected');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSave = async () => {
    if (!integration) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('team_mos_integrations')
        .update({
          enabled: integration.enabled,
          xpression_host: integration.xpression_host,
          xpression_port: integration.xpression_port,
          mos_id: integration.mos_id,
          auto_take_enabled: integration.auto_take_enabled,
          debounce_ms: integration.debounce_ms,
        })
        .eq('id', integration.id);

      if (error) throw error;

      toast({
        title: 'Settings saved',
        description: 'MOS integration settings have been updated',
      });
    } catch (error) {
      console.error('Error saving MOS integration:', error);
      toast({
        title: 'Error',
        description: 'Failed to save MOS integration settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setConnectionStatus('checking');
    toast({
      title: 'Testing connection',
      description: 'Attempting to connect to XPression...',
    });

    // In real implementation, this would test the connection
    setTimeout(() => {
      setConnectionStatus('disconnected');
      toast({
        title: 'Connection test',
        description: 'Connection manager not yet implemented (Phase 2)',
      });
    }, 2000);
  };

  if (!isFeatureEnabled) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!integration) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>MOS Integration (XPression)</CardTitle>
          <CardDescription>
            Connect Cuer to Ross XPression graphics system using MOS Protocol 4
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable MOS Integration</Label>
              <p className="text-sm text-muted-foreground">
                Automatically sync rundown data to XPression
              </p>
            </div>
            <Switch
              checked={integration.enabled}
              onCheckedChange={(checked) =>
                setIntegration({ ...integration, enabled: checked })
              }
            />
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
            <div className="flex items-center gap-2">
              {connectionStatus === 'connected' && (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">Connected to XPression</span>
                </>
              )}
              {connectionStatus === 'disconnected' && (
                <>
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <span className="text-sm font-medium">Disconnected</span>
                </>
              )}
              {connectionStatus === 'checking' && (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm font-medium">Checking connection...</span>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={!integration.xpression_host || connectionStatus === 'checking'}
            >
              Test Connection
            </Button>
          </div>

          {/* XPression Host */}
          <div className="space-y-2">
            <Label htmlFor="xpression_host">XPression Host IP</Label>
            <Input
              id="xpression_host"
              placeholder="192.168.1.100"
              value={integration.xpression_host || ''}
              onChange={(e) =>
                setIntegration({ ...integration, xpression_host: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              IP address of the XPression graphics system
            </p>
          </div>

          {/* XPression Port */}
          <div className="space-y-2">
            <Label htmlFor="xpression_port">XPression Port</Label>
            <Input
              id="xpression_port"
              type="number"
              placeholder="10540"
              value={integration.xpression_port || 10540}
              onChange={(e) =>
                setIntegration({ ...integration, xpression_port: parseInt(e.target.value) })
              }
            />
            <p className="text-xs text-muted-foreground">
              MOS port (default: 10540)
            </p>
          </div>

          {/* MOS ID */}
          <div className="space-y-2">
            <Label htmlFor="mos_id">MOS NCS ID</Label>
            <Input
              id="mos_id"
              value={integration.mos_id}
              onChange={(e) =>
                setIntegration({ ...integration, mos_id: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Unique identifier for this newsroom system
            </p>
          </div>

          {/* Auto-Take */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Take Graphics</Label>
              <p className="text-sm text-muted-foreground">
                Automatically take graphics live when showcaller advances
              </p>
            </div>
            <Switch
              checked={integration.auto_take_enabled}
              onCheckedChange={(checked) =>
                setIntegration({ ...integration, auto_take_enabled: checked })
              }
            />
          </div>

          {/* Debounce */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Update Debounce (ms)</Label>
              <span className="text-sm text-muted-foreground">{integration.debounce_ms}ms</span>
            </div>
            <Slider
              value={[integration.debounce_ms]}
              onValueChange={([value]) =>
                setIntegration({ ...integration, debounce_ms: value })
              }
              min={500}
              max={5000}
              step={100}
            />
            <p className="text-xs text-muted-foreground">
              Wait time before sending content updates to XPression
            </p>
          </div>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Field Mapper */}
      {integration.enabled && (
        <MOSFieldMapper teamId={teamId} integrationId={integration.id} />
      )}
    </div>
  );
};

export default MOSIntegrationSettings;
