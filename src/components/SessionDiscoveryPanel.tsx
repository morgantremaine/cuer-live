import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RefreshCw, Users, Wifi, Lock, Search, AlertCircle } from 'lucide-react';
import { useLocalSessionDiscovery, DiscoveredSession } from '@/hooks/useLocalSessionDiscovery';
import { useToast } from '@/hooks/use-toast';

interface SessionDiscoveryPanelProps {
  onSessionConnect?: (websocketUrl: string, session: DiscoveredSession) => void;
  enabled?: boolean;
}

const SessionDiscoveryPanel = ({ onSessionConnect, enabled = true }: SessionDiscoveryPanelProps) => {
  const { toast } = useToast();
  const discovery = useLocalSessionDiscovery(enabled);
  
  const [selectedSession, setSelectedSession] = useState<DiscoveredSession | null>(null);
  const [sessionPin, setSessionPin] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  const handleJoinSession = async () => {
    if (!selectedSession || !sessionPin) {
      toast({
        title: "Missing information",
        description: "Please enter the session PIN to join",
        variant: "destructive"
      });
      return;
    }

    setIsConnecting(true);
    
    try {
      const result = await discovery.connectToSession(selectedSession, sessionPin);
      
      if (result.success) {
        onSessionConnect?.(result.websocketUrl, selectedSession);
        setIsJoinDialogOpen(false);
        setSessionPin('');
        
        toast({
          title: "Connected to session",
          description: `Successfully joined "${selectedSession.name}"`
        });
      } else {
        toast({
          title: "Connection failed",
          description: result.error || "Could not connect to session. Check your PIN and try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Connection error",
        description: "An unexpected error occurred while connecting",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Discover Local Sessions
        </CardTitle>
        <CardDescription>
          Find and join active Cuer sessions on your network. Sessions allow real-time collaboration without internet.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Scan controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {discovery.isScanning && (
              <RefreshCw className="h-4 w-4 animate-spin" />
            )}
            <span className="text-sm text-muted-foreground">
              {discovery.isScanning 
                ? 'Scanning for sessions...' 
                : discovery.lastScan > 0 
                  ? `Last scan: ${formatTimeAgo(discovery.lastScan)}`
                  : 'Ready to scan'
              }
            </span>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={discovery.scan}
            disabled={discovery.isScanning}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${discovery.isScanning ? 'animate-spin' : ''}`} />
            Scan Now
          </Button>
        </div>

        {/* Error state */}
        {discovery.error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">{discovery.error}</span>
          </div>
        )}

        {/* Sessions list */}
        <div className="space-y-2">
          {discovery.discoveredSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wifi className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div>No sessions discovered</div>
              <div className="text-sm">
                {discovery.isScanning 
                  ? 'Scanning for active sessions...'
                  : 'Click "Scan Now" to search for local sessions'
                }
              </div>
            </div>
          ) : (
            discovery.discoveredSessions.map((session) => (
              <Card key={session.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">{session.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {session.host.name} • {formatTimeAgo(session.createdAt)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {session.clientCount} connected
                        </Badge>
                        {session.host.capabilities.includes('yjs-sync') && (
                          <Badge variant="secondary" className="text-xs">
                            Real-time
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <Dialog 
                      open={isJoinDialogOpen && selectedSession?.id === session.id} 
                      onOpenChange={(open) => {
                        setIsJoinDialogOpen(open);
                        if (open) setSelectedSession(session);
                        else setSelectedSession(null);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Lock className="h-4 w-4 mr-2" />
                          Join
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Join Session</DialogTitle>
                          <DialogDescription>
                            Enter the session PIN to join "{session.name}"
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div className="p-3 bg-muted rounded-lg">
                            <div className="font-medium">{session.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Host: {session.host.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {session.clientCount} users connected
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor="session-pin">Session PIN</Label>
                            <Input
                              id="session-pin"
                              type="text"
                              placeholder="000000"
                              value={sessionPin}
                              onChange={(e) => setSessionPin(e.target.value)}
                              maxLength={6}
                              className="font-mono text-center text-lg"
                            />
                          </div>
                          
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              onClick={() => setIsJoinDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleJoinSession}
                              disabled={isConnecting || !sessionPin}
                            >
                              {isConnecting ? 'Connecting...' : 'Join Session'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Discovery info */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-sm text-blue-700 dark:text-blue-200">
            <div className="font-medium mb-1">How Session Discovery Works</div>
            <div className="space-y-1 text-xs">
              <div>• Automatically scans common local network addresses</div>
              <div>• Checks saved hosts from Local Host Manager</div>
              <div>• Sessions require a 6-digit PIN for security</div>
              <div>• Real-time sync works without internet once connected</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SessionDiscoveryPanel;