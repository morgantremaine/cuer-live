import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Router, Copy, QrCode } from 'lucide-react';
import { useTransportManager, LocalHostInfo } from '@/hooks/useTransportManager';
import { useToast } from '@/hooks/use-toast';

const LocalHostManager = () => {
  const { transport, availableHosts, addSavedHost, removeSavedHost, forceTransportMode } = useTransportManager();
  const { toast } = useToast();
  
  const [newHostUrl, setNewHostUrl] = useState('');
  const [newHostName, setNewHostName] = useState('');
  const [isAddHostOpen, setIsAddHostOpen] = useState(false);

  const handleAddHost = () => {
    if (!newHostUrl || !newHostName) {
      toast({
        title: "Invalid input",
        description: "Please provide both URL and name for the host",
        variant: "destructive"
      });
      return;
    }

    // Validate URL format
    if (!newHostUrl.startsWith('ws://') && !newHostUrl.startsWith('http://')) {
      toast({
        title: "Invalid URL",
        description: "URL must start with ws:// or http://",
        variant: "destructive"
      });
      return;
    }

    addSavedHost(newHostUrl, newHostName);
    setNewHostUrl('');
    setNewHostName('');
    setIsAddHostOpen(false);
    
    toast({
      title: "Host added",
      description: "Local host has been saved and will be auto-discovered"
    });
  };

  const handleConnectToHost = (host: LocalHostInfo) => {
    forceTransportMode('local', {
      localHostUrl: host.url,
      sessionPin: host.sessionPin
    });
    
    toast({
      title: "Connecting to local host",
      description: `Connecting to ${host.name}...`
    });
  };

  const handleRemoveHost = (hostUrl: string) => {
    removeSavedHost(hostUrl);
    toast({
      title: "Host removed",
      description: "Local host has been removed from saved hosts"
    });
  };

  const copySessionPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    toast({
      title: "Session PIN copied",
      description: "PIN has been copied to clipboard"
    });
  };

  const generateQRCode = (host: LocalHostInfo) => {
    const qrData = {
      type: 'cuer-host',
      url: host.url,
      pin: host.sessionPin,
      name: host.name
    };
    
    // For now, just copy the JSON - in a real implementation, 
    // you'd generate a QR code image
    navigator.clipboard.writeText(JSON.stringify(qrData));
    toast({
      title: "QR data copied",
      description: "Host connection data copied to clipboard"
    });
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Router className="h-5 w-5" />
          Local Host Manager
        </CardTitle>
        <CardDescription>
          Manage and connect to local Cuer hosts on your network. 
          Local hosts enable real-time collaboration even when internet is down.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current transport status */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <div className="font-medium">Current Connection</div>
            <div className="text-sm text-muted-foreground">
              {transport.mode === 'local' 
                ? `Local Host: ${transport.localHostUrl}`
                : transport.mode === 'cloud' 
                  ? 'Cloud (Supabase)'
                  : 'Offline Mode'
              }
            </div>
          </div>
          <Badge 
            variant={transport.isConnected ? "default" : "secondary"}
            className={transport.isConnected ? "bg-green-500" : ""}
          >
            {transport.isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>

        {/* Available hosts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base">Available Hosts</Label>
            <Dialog open={isAddHostOpen} onOpenChange={setIsAddHostOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Host
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Local Host</DialogTitle>
                  <DialogDescription>
                    Add a local Cuer host to your saved hosts list for automatic discovery.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="host-url">Host URL</Label>
                    <Input
                      id="host-url"
                      placeholder="ws://192.168.1.100:1234"
                      value={newHostUrl}
                      onChange={(e) => setNewHostUrl(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="host-name">Host Name</Label>
                    <Input
                      id="host-name"
                      placeholder="Production Laptop"
                      value={newHostName}
                      onChange={(e) => setNewHostName(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAddHostOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddHost}>
                      Add Host
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            {availableHosts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Router className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <div>No local hosts discovered</div>
                <div className="text-sm">Start a Cuer Host or add one manually</div>
              </div>
            ) : (
              availableHosts.map((host, index) => (
                <Card key={index} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">{host.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {host.url}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={host.isAvailable ? "default" : "secondary"}
                            className={host.isAvailable ? "bg-green-500" : ""}
                          >
                            {host.isAvailable ? 'Available' : 'Offline'}
                          </Badge>
                          {host.sessionPin && (
                            <Badge variant="outline" className="font-mono">
                              PIN: {host.sessionPin}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {host.sessionPin && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copySessionPin(host.sessionPin)}
                              title="Copy Session PIN"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => generateQRCode(host)}
                              title="Generate QR Code"
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        
                        {host.isAvailable && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConnectToHost(host)}
                            disabled={transport.mode === 'local' && transport.localHostUrl === host.url}
                          >
                            {transport.mode === 'local' && transport.localHostUrl === host.url 
                              ? 'Connected' 
                              : 'Connect'
                            }
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveHost(host.url)}
                          title="Remove Host"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Quick setup instructions */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Quick Setup
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
            <div>1. Download and run the Cuer Host app on a local machine</div>
            <div>2. Note the session PIN displayed in the host app</div>
            <div>3. The host will be automatically discovered on your network</div>
            <div>4. Click "Connect" to use the local host for real-time sync</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocalHostManager;