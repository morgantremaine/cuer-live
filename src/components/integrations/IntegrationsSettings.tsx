import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, TestTube, Key, Eye, EyeOff, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CueDebugPanel } from './CueDebugPanel';

interface Integration {
  id: string;
  name: string;
  integration_type: 'webhook' | 'osc';
  endpoint_url?: string;
  http_method?: string;
  auth_headers?: Record<string, string>;
  custom_headers?: Record<string, string>;
  osc_host?: string;
  osc_port?: number;
  osc_path?: string;
  is_active: boolean;
  rate_limit_per_minute: number;
  retry_attempts: number;
}

interface ApiKey {
  id: string;
  name: string;
  api_key: string;
  permissions: string[];
  is_active: boolean;
  expires_at?: string;
  created_at: string;
}

interface IntegrationsSettingsProps {
  teamId: string;
}

export const IntegrationsSettings: React.FC<IntegrationsSettingsProps> = ({ teamId }) => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewIntegration, setShowNewIntegration] = useState(false);
  const [showNewApiKey, setShowNewApiKey] = useState(false);
  const [visibleApiKeys, setVisibleApiKeys] = useState<Set<string>>(new Set());
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const { toast } = useToast();

  // New integration form state
  const [newIntegration, setNewIntegration] = useState({
    name: '',
    integration_type: 'webhook' as 'webhook' | 'osc',
    endpoint_url: '',
    http_method: 'POST',
    auth_headers: '',
    custom_headers: '',
    osc_host: '',
    osc_port: 3333,
    osc_path: '/cue',
    rate_limit_per_minute: 60,
    retry_attempts: 3,
  });

  // New API key form state
  const [newApiKeyName, setNewApiKeyName] = useState('');

  useEffect(() => {
    fetchData();
  }, [teamId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch integrations
      const { data: integrationsData, error: integrationsError } = await supabase
        .from('team_integrations')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (integrationsError) throw integrationsError;

      // Fetch API keys
      const { data: apiKeysData, error: apiKeysError } = await supabase
        .from('team_api_keys')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (apiKeysError) throw apiKeysError;

      setIntegrations(integrationsData || []);
      setApiKeys(apiKeysData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load integration settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIntegration = async () => {
    try {
      const integrationData = {
        team_id: teamId,
        name: newIntegration.name,
        integration_type: newIntegration.integration_type,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        rate_limit_per_minute: newIntegration.rate_limit_per_minute,
        retry_attempts: newIntegration.retry_attempts,
        ...(newIntegration.integration_type === 'webhook' ? {
          endpoint_url: newIntegration.endpoint_url,
          http_method: newIntegration.http_method,
          auth_headers: newIntegration.auth_headers ? JSON.parse(newIntegration.auth_headers) : {},
          custom_headers: newIntegration.custom_headers ? JSON.parse(newIntegration.custom_headers) : {},
        } : {
          osc_host: newIntegration.osc_host,
          osc_port: newIntegration.osc_port,
          osc_path: newIntegration.osc_path,
        }),
      };

      const { error } = await supabase
        .from('team_integrations')
        .insert(integrationData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Integration created successfully",
      });

      setShowNewIntegration(false);
      setNewIntegration({
        name: '',
        integration_type: 'webhook',
        endpoint_url: '',
        http_method: 'POST',
        auth_headers: '',
        custom_headers: '',
        osc_host: '',
        osc_port: 3333,
        osc_path: '/cue',
        rate_limit_per_minute: 60,
        retry_attempts: 3,
      });
      fetchData();
    } catch (error) {
      console.error('Error creating integration:', error);
      toast({
        title: "Error",
        description: "Failed to create integration",
        variant: "destructive",
      });
    }
  };

  const handleCreateApiKey = async () => {
    try {
      const apiKey = `sk_${crypto.randomUUID().replace(/-/g, '')}`;
      
      const { error } = await supabase
        .from('team_api_keys')
        .insert({
          team_id: teamId,
          name: newApiKeyName,
          api_key: apiKey,
          permissions: ['read'],
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "API key created successfully",
      });

      setShowNewApiKey(false);
      setNewApiKeyName('');
      fetchData();
    } catch (error) {
      console.error('Error creating API key:', error);
      toast({
        title: "Error",
        description: "Failed to create API key",
        variant: "destructive",
      });
    }
  };

  const handleDeleteIntegration = async (integrationId: string) => {
    try {
      const { error } = await supabase
        .from('team_integrations')
        .delete()
        .eq('id', integrationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Integration deleted successfully",
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting integration:', error);
      toast({
        title: "Error",
        description: "Failed to delete integration",
        variant: "destructive",
      });
    }
  };

  const handleTestIntegration = async (integration: Integration) => {
    try {
      const testRundownId = crypto.randomUUID();
      const testSegmentId = crypto.randomUUID();
      
      const testPayload = {
        event: "test_cue",
        timestamp: new Date().toISOString(),
        rundown: {
          id: testRundownId,
          title: "Test Rundown",
        },
        current_segment: {
          id: testSegmentId,
          name: "Test Segment",
          slug: "test_segment",
        },
        showcaller_state: {
          is_playing: false,
        },
      };

      const { error } = await supabase.functions.invoke('send-cue-trigger', {
        body: {
          teamId,
          rundownId: testRundownId,
          payload: testPayload,
        },
      });

      if (error) throw error;

      toast({
        title: "Test Sent",
        description: `Test cue sent to ${integration.name}`,
      });
    } catch (error) {
      console.error('Error testing integration:', error);
      toast({
        title: "Test Failed",
        description: "Failed to send test cue",
        variant: "destructive",
      });
    }
  };

  const handleDeleteApiKey = async (apiKeyId: string) => {
    try {
      const { error } = await supabase
        .from('team_api_keys')
        .delete()
        .eq('id', apiKeyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "API key deleted successfully",
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast({
        title: "Error",
        description: "Failed to delete API key",
        variant: "destructive",
      });
    }
  };

  const startEditIntegration = (integration: Integration) => {
    setEditingIntegration(integration);
    setNewIntegration({
      name: integration.name,
      integration_type: integration.integration_type,
      endpoint_url: integration.endpoint_url || '',
      http_method: integration.http_method || 'POST',
      auth_headers: integration.auth_headers ? JSON.stringify(integration.auth_headers) : '',
      custom_headers: integration.custom_headers ? JSON.stringify(integration.custom_headers) : '',
      osc_host: integration.osc_host || '',
      osc_port: integration.osc_port || 3333,
      osc_path: integration.osc_path || '/cue',
      rate_limit_per_minute: integration.rate_limit_per_minute,
      retry_attempts: integration.retry_attempts,
    });
    setShowNewIntegration(true);
  };

  const handleUpdateIntegration = async () => {
    if (!editingIntegration) return;

    try {
      const integrationData = {
        name: newIntegration.name,
        integration_type: newIntegration.integration_type,
        rate_limit_per_minute: newIntegration.rate_limit_per_minute,
        retry_attempts: newIntegration.retry_attempts,
        ...(newIntegration.integration_type === 'webhook' ? {
          endpoint_url: newIntegration.endpoint_url,
          http_method: newIntegration.http_method,
          auth_headers: newIntegration.auth_headers ? JSON.parse(newIntegration.auth_headers) : {},
          custom_headers: newIntegration.custom_headers ? JSON.parse(newIntegration.custom_headers) : {},
        } : {
          osc_host: newIntegration.osc_host,
          osc_port: newIntegration.osc_port,
          osc_path: newIntegration.osc_path,
        }),
      };

      const { error } = await supabase
        .from('team_integrations')
        .update(integrationData)
        .eq('id', editingIntegration.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Integration updated successfully",
      });

      setShowNewIntegration(false);
      setEditingIntegration(null);
      setNewIntegration({
        name: '',
        integration_type: 'webhook',
        endpoint_url: '',
        http_method: 'POST',
        auth_headers: '',
        custom_headers: '',
        osc_host: '',
        osc_port: 3333,
        osc_path: '/cue',
        rate_limit_per_minute: 60,
        retry_attempts: 3,
      });
      fetchData();
    } catch (error) {
      console.error('Error updating integration:', error);
      toast({
        title: "Error",
        description: "Failed to update integration",
        variant: "destructive",
      });
    }
  };

  const cancelEditIntegration = () => {
    setEditingIntegration(null);
    setShowNewIntegration(false);
    setNewIntegration({
      name: '',
      integration_type: 'webhook',
      endpoint_url: '',
      http_method: 'POST',
      auth_headers: '',
      custom_headers: '',
      osc_host: '',
      osc_port: 3333,
      osc_path: '/cue',
      rate_limit_per_minute: 60,
      retry_attempts: 3,
    });
  };

  const toggleApiKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleApiKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleApiKeys(newVisible);
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Integrations Section */}
      <Card>
        <CardHeader>
          <CardTitle>External Integrations</CardTitle>
          <CardDescription>
            Configure webhooks and OSC endpoints to send cue triggers to external systems
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {integrations.map((integration) => (
            <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-medium">{integration.name}</h4>
                  <Badge variant={integration.integration_type === 'webhook' ? 'default' : 'secondary'}>
                    {integration.integration_type.toUpperCase()}
                  </Badge>
                  <Badge variant={integration.is_active ? 'default' : 'secondary'}>
                    {integration.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {integration.integration_type === 'webhook' 
                    ? `${integration.http_method} ${integration.endpoint_url}`
                    : `${integration.osc_host}:${integration.osc_port}${integration.osc_path}`
                  }
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestIntegration(integration)}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Test
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startEditIntegration(integration)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteIntegration(integration.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {showNewIntegration && (
            <Card>
              <CardHeader>
                <CardTitle>{editingIntegration ? 'Edit Integration' : 'New Integration'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="integration-name">Name</Label>
                    <Input
                      id="integration-name"
                      value={newIntegration.name}
                      onChange={(e) => setNewIntegration({ ...newIntegration, name: e.target.value })}
                      placeholder="Unreal Engine"
                    />
                  </div>
                  <div>
                    <Label htmlFor="integration-type">Type</Label>
                    <Select
                      value={newIntegration.integration_type}
                      onValueChange={(value: 'webhook' | 'osc') => 
                        setNewIntegration({ ...newIntegration, integration_type: value })
                      }
                      disabled={!!editingIntegration}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="webhook">Webhook</SelectItem>
                        <SelectItem value="osc">OSC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {newIntegration.integration_type === 'webhook' ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="endpoint-url">Endpoint URL</Label>
                      <Input
                        id="endpoint-url"
                        value={newIntegration.endpoint_url}
                        onChange={(e) => setNewIntegration({ ...newIntegration, endpoint_url: e.target.value })}
                        placeholder="http://localhost:8080/cue"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="http-method">HTTP Method</Label>
                        <Select
                          value={newIntegration.http_method}
                          onValueChange={(value) => 
                            setNewIntegration({ ...newIntegration, http_method: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="PATCH">PATCH</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="osc-host">Host</Label>
                        <Input
                          id="osc-host"
                          value={newIntegration.osc_host}
                          onChange={(e) => setNewIntegration({ ...newIntegration, osc_host: e.target.value })}
                          placeholder="localhost"
                        />
                      </div>
                      <div>
                        <Label htmlFor="osc-port">Port</Label>
                        <Input
                          id="osc-port"
                          type="number"
                          value={newIntegration.osc_port}
                          onChange={(e) => setNewIntegration({ ...newIntegration, osc_port: parseInt(e.target.value) })}
                          placeholder="3333"
                        />
                      </div>
                      <div>
                        <Label htmlFor="osc-path">Path</Label>
                        <Input
                          id="osc-path"
                          value={newIntegration.osc_path}
                          onChange={(e) => setNewIntegration({ ...newIntegration, osc_path: e.target.value })}
                          placeholder="/cue"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={editingIntegration ? handleUpdateIntegration : handleCreateIntegration}>
                    {editingIntegration ? 'Update Integration' : 'Create Integration'}
                  </Button>
                  <Button variant="outline" onClick={editingIntegration ? cancelEditIntegration : () => setShowNewIntegration(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Button 
            variant="outline" 
            onClick={() => setShowNewIntegration(true)}
            disabled={showNewIntegration}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Integration
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* API Keys Section */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Generate API keys for external systems to access your rundown data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {apiKeys.map((apiKey) => (
            <div key={apiKey.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-medium">{apiKey.name}</h4>
                  <Badge variant={apiKey.is_active ? 'default' : 'secondary'}>
                    {apiKey.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {visibleApiKeys.has(apiKey.id) 
                      ? apiKey.api_key 
                      : `${apiKey.api_key.substring(0, 12)}...`
                    }
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleApiKeyVisibility(apiKey.id)}
                  >
                    {visibleApiKeys.has(apiKey.id) ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Created {new Date(apiKey.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteApiKey(apiKey.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {showNewApiKey && (
            <Card>
              <CardHeader>
                <CardTitle>New API Key</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="api-key-name">Name</Label>
                  <Input
                    id="api-key-name"
                    value={newApiKeyName}
                    onChange={(e) => setNewApiKeyName(e.target.value)}
                    placeholder="Unreal Engine Integration"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateApiKey}>Create API Key</Button>
                  <Button variant="outline" onClick={() => setShowNewApiKey(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Button 
            variant="outline" 
            onClick={() => setShowNewApiKey(true)}
            disabled={showNewApiKey}
          >
            <Key className="h-4 w-4 mr-2" />
            Generate API Key
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Debug Panel Section */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Debug Panel</CardTitle>
          <CardDescription>
            Monitor cue triggers and integration logs in real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CueDebugPanel teamId={teamId} />
        </CardContent>
      </Card>
    </div>
  );
};