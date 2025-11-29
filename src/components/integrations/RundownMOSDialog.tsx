import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wifi, WifiOff, Send, Trash2, Plus, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MOSDebugPanel } from './MOSDebugPanel';

interface RundownMOSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rundownId: string;
  teamId: string;
  userEmail?: string;
}

interface FieldMapping {
  id: string;
  cuer_column_key: string;
  xpression_field_name: string;
  field_order: number;
  is_template_column: boolean;
}

interface ConnectionStatus {
  connected: boolean;
  last_heartbeat: string | null;
  error_message: string | null;
  xpression_host: string | null;
}

// Standard Cuer columns that can be mapped
const CUER_COLUMNS = [
  { key: 'rowNumber', label: 'Row Number' },
  { key: 'name', label: 'Name/Title' },
  { key: 'startTime', label: 'Start Time' },
  { key: 'duration', label: 'Duration' },
  { key: 'endTime', label: 'End Time' },
  { key: 'elapsedTime', label: 'Elapsed Time' },
  { key: 'talent', label: 'Talent' },
  { key: 'script', label: 'Script' },
  { key: 'gfx', label: 'GFX' },
  { key: 'video', label: 'Video' },
  { key: 'images', label: 'Images' },
  { key: 'notes', label: 'Notes' },
  { key: 'isFloating', label: 'Floating Status' },
  { key: 'type', label: 'Item Type' },
];

export const RundownMOSDialog: React.FC<RundownMOSDialogProps> = ({
  open,
  onOpenChange,
  rundownId,
  teamId,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  
  // MOS Configuration
  const [mosEnabled, setMosEnabled] = useState(false);
  const [mosId, setMosId] = useState('CUER_MOS_01');
  const [xpressionHost, setXpressionHost] = useState('');
  const [xpressionPort, setXpressionPort] = useState(6000);
  const [debounceMs, setDebounceMs] = useState(1000);
  const [autoTakeEnabled, setAutoTakeEnabled] = useState(false);
  const [triggerOnShowcaller, setTriggerOnShowcaller] = useState(true);
  const [triggerOnEditorial, setTriggerOnEditorial] = useState(true);
  
  // Field Mappings
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [customColumns, setCustomColumns] = useState<{ key: string; label: string }[]>([]);
  const [newMapping, setNewMapping] = useState({
    cuerColumn: '',
    xpressionField: '',
    isTemplateColumn: false,
  });
  
  // Connection Status
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, rundownId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch rundown MOS settings
      const { data: rundownData, error: rundownError } = await supabase
        .from('rundowns')
        .select('mos_enabled, mos_id, mos_xpression_host, mos_xpression_port, mos_debounce_ms, mos_auto_take_enabled, mos_trigger_on_showcaller, mos_trigger_on_editorial')
        .eq('id', rundownId)
        .single();

      if (rundownError) throw rundownError;

        setMosEnabled(rundownData?.mos_enabled || false);
        setMosId(rundownData?.mos_id || 'CUER_MOS_01');
        setXpressionHost(rundownData?.mos_xpression_host || '');
        setXpressionPort(rundownData?.mos_xpression_port || 6000);
        setDebounceMs(rundownData?.mos_debounce_ms || 1000);
        setAutoTakeEnabled(rundownData?.mos_auto_take_enabled || false);
        setTriggerOnShowcaller(rundownData?.mos_trigger_on_showcaller ?? true);
        setTriggerOnEditorial(rundownData?.mos_trigger_on_editorial ?? true);

      // Fetch field mappings
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('rundown_mos_field_mappings')
        .select('*')
        .eq('rundown_id', rundownId)
        .order('field_order', { ascending: true });

      if (mappingsError) throw mappingsError;
      setMappings(mappingsData || []);

      // Fetch custom columns for this team
      const { data: customColumnsData, error: customColumnsError } = await supabase
        .from('team_custom_columns')
        .select('*')
        .eq('team_id', teamId);

      if (customColumnsError) throw customColumnsError;
      setCustomColumns(
        (customColumnsData || []).map(col => ({
          key: col.column_key,
          label: col.column_name,
        }))
      );

      // Fetch connection status
      const { data: statusData, error: statusError } = await supabase
        .from('mos_connection_status')
        .select('*')
        .eq('team_id', teamId)
        .eq('rundown_id', rundownId)
        .single();

      if (statusError && statusError.code !== 'PGRST116') {
        console.error('Error fetching connection status:', statusError);
      }
      setConnectionStatus(statusData);

    } catch (error) {
      console.error('Error loading MOS data:', error);
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
    try {
      setSaving(true);

      const { error } = await supabase
        .from('rundowns')
        .update({
          mos_enabled: mosEnabled,
          mos_id: mosId,
          mos_xpression_host: xpressionHost,
          mos_xpression_port: xpressionPort,
          mos_debounce_ms: debounceMs,
          mos_auto_take_enabled: autoTakeEnabled,
          mos_trigger_on_showcaller: triggerOnShowcaller,
          mos_trigger_on_editorial: triggerOnEditorial,
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
    if (!xpressionHost || !xpressionPort) {
      toast({
        title: 'Configuration Required',
        description: 'Please configure Xpression host and port first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setTesting(true);

      const { data, error } = await supabase.functions.invoke('mos-send-message', {
        body: {
          teamId,
          rundownId,
          eventType: 'TEST',
          segmentId: 'test-segment-' + Date.now(),
          segmentData: {
            name: 'Test Message',
            startTime: '10:00:00',
            talent: 'Test Talent',
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Test Successful',
          description: 'Test message sent to Xpression successfully',
        });
      } else {
        throw new Error(data?.message || 'Test failed');
      }
    } catch (error: any) {
      console.error('Test send error:', error);
      toast({
        title: 'Test Failed',
        description: error.message || 'Failed to send test message',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
      await fetchData(); // Refresh connection status
    }
  };

  const handleAddMapping = async () => {
    if (!newMapping.cuerColumn || !newMapping.xpressionField) {
      toast({
        title: 'Validation Error',
        description: 'Please select both a Cuer column and Xpression field',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('rundown_mos_field_mappings')
        .insert({
          rundown_id: rundownId,
          cuer_column_key: newMapping.cuerColumn,
          xpression_field_name: newMapping.xpressionField,
          is_template_column: newMapping.isTemplateColumn,
          field_order: mappings.length,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Field mapping added',
      });

      setNewMapping({
        cuerColumn: '',
        xpressionField: '',
        isTemplateColumn: false,
      });

      await fetchData();
    } catch (error) {
      console.error('Error adding field mapping:', error);
      toast({
        title: 'Error',
        description: 'Failed to add field mapping',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    try {
      const { error } = await supabase
        .from('rundown_mos_field_mappings')
        .delete()
        .eq('id', mappingId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Field mapping deleted',
      });

      await fetchData();
    } catch (error) {
      console.error('Error deleting field mapping:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete field mapping',
        variant: 'destructive',
      });
    }
  };

  const allColumns = [...CUER_COLUMNS, ...customColumns];

  const getColumnLabel = (key: string) => {
    const column = allColumns.find(col => col.key === key);
    return column?.label || key;
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Loading MOS Settings</DialogTitle>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>XPRESSION MOS SETTINGS</DialogTitle>
          <DialogDescription>
            Configure Ross Xpression MOS integration for this rundown
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Connection Status */}
          {connectionStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {connectionStatus.connected ? (
                    <Wifi className="w-4 h-4 text-green-500" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-500" />
                  )}
                  Connection Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={connectionStatus.connected ? 'default' : 'destructive'}>
                    {connectionStatus.connected ? 'Connected' : 'Disconnected'}
                  </Badge>
                  {connectionStatus.xpression_host && (
                    <span className="text-sm text-muted-foreground">
                      {connectionStatus.xpression_host}
                    </span>
                  )}
                </div>
                {connectionStatus.last_heartbeat && (
                  <p className="text-xs text-muted-foreground">
                    Last seen: {new Date(connectionStatus.last_heartbeat).toLocaleString()}
                  </p>
                )}
                {connectionStatus.error_message && (
                  <p className="text-xs text-destructive">{connectionStatus.error_message}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* MOS Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">MOS Configuration</CardTitle>
              <CardDescription>
                Configure Ross Xpression connection settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="mos-enabled">Enable MOS Integration</Label>
                  <p className="text-xs text-muted-foreground">
                    Send segment changes to Ross Xpression
                  </p>
                </div>
                <Switch
                  id="mos-enabled"
                  checked={mosEnabled}
                  onCheckedChange={setMosEnabled}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mos-id">MOS ID</Label>
                  <Input
                    id="mos-id"
                    value={mosId}
                    onChange={(e) => setMosId(e.target.value)}
                    placeholder="CUER_MOS_01"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="xpression-host">Xpression Host (IP)</Label>
                  <Input
                    id="xpression-host"
                    value={xpressionHost}
                    onChange={(e) => setXpressionHost(e.target.value)}
                    placeholder="192.168.1.100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="xpression-port">Xpression Port</Label>
                  <Input
                    id="xpression-port"
                    type="number"
                    value={xpressionPort}
                    onChange={(e) => setXpressionPort(parseInt(e.target.value) || 6000)}
                    placeholder="6000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="debounce">Debounce (ms)</Label>
                  <Input
                    id="debounce"
                    type="number"
                    value={debounceMs}
                    onChange={(e) => setDebounceMs(parseInt(e.target.value) || 1000)}
                    placeholder="1000"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label htmlFor="auto-take">Auto-Take Graphics</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically take graphics on segment change
                  </p>
                </div>
                <Switch
                  id="auto-take"
                  checked={autoTakeEnabled}
                  onCheckedChange={setAutoTakeEnabled}
                />
              </div>
            </CardContent>
          </Card>

          {/* MOS Trigger Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">MOS Trigger Settings</CardTitle>
              <CardDescription>
                Control when MOS messages are sent to Xpression
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="trigger-showcaller">Send MOS on Showcaller</Label>
                  <p className="text-xs text-muted-foreground">
                    Update Xpression when the current segment advances during on-air
                  </p>
                </div>
                <Switch
                  id="trigger-showcaller"
                  checked={triggerOnShowcaller}
                  onCheckedChange={setTriggerOnShowcaller}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="trigger-editorial">Send MOS on Editorial Changes</Label>
                  <p className="text-xs text-muted-foreground">
                    Update Xpression when segments are reordered or floated/unfloated
                  </p>
                </div>
                <Switch
                  id="trigger-editorial"
                  checked={triggerOnEditorial}
                  onCheckedChange={setTriggerOnEditorial}
                />
              </div>
            </CardContent>
          </Card>

          {/* Field Mappings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Field Mapping</CardTitle>
              <CardDescription>
                Map Cuer columns to Xpression template fields
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mappings.length > 0 && (
                <div className="space-y-2">
                  {mappings.map((mapping) => (
                    <div
                      key={mapping.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                    >
                      <div className="flex-1 flex items-center gap-3">
                        <div className="text-sm font-medium">{getColumnLabel(mapping.cuer_column_key)}</div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <div className="text-sm text-muted-foreground">{mapping.xpression_field_name}</div>
                        {mapping.is_template_column && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            Template
                          </span>
                        )}
                      </div>
                      <Button
                        onClick={() => handleDeleteMapping(mapping.id)}
                        variant="ghost"
                        size="icon"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cuer Column</Label>
                    <Select
                      value={newMapping.cuerColumn}
                      onValueChange={(value) => setNewMapping({ ...newMapping, cuerColumn: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column..." />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="font-semibold text-xs px-2 py-1.5 text-muted-foreground">
                          Standard Columns
                        </div>
                        {CUER_COLUMNS.map((col) => (
                          <SelectItem key={col.key} value={col.key}>
                            {col.label}
                          </SelectItem>
                        ))}
                        {customColumns.length > 0 && (
                          <>
                            <div className="font-semibold text-xs px-2 py-1.5 text-muted-foreground mt-2">
                              Custom Columns
                            </div>
                            {customColumns.map((col) => (
                              <SelectItem key={col.key} value={col.key}>
                                {col.label}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Xpression Field Name</Label>
                    <Input
                      value={newMapping.xpressionField}
                      onChange={(e) => setNewMapping({ ...newMapping, xpressionField: e.target.value })}
                      placeholder="e.g., F1, F2, Title"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="template-column"
                    checked={newMapping.isTemplateColumn}
                    onChange={(e) => setNewMapping({ ...newMapping, isTemplateColumn: e.target.checked })}
                    className="h-4 w-4 rounded border-border"
                  />
                  <Label htmlFor="template-column" className="text-sm font-normal cursor-pointer">
                    This field contains the Xpression template name
                  </Label>
                </div>

                <Button onClick={handleAddMapping} variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Field Mapping
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Test Send */}
          {mosEnabled && xpressionHost && (
            <Button
              onClick={handleTestSend}
              variant="outline"
              disabled={testing}
              className="w-full"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending Test Message...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Test Message
                </>
              )}
            </Button>
          )}

          {/* Message Log */}
          <MOSDebugPanel teamId={teamId} />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
