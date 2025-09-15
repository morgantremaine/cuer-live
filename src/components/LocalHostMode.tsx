import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Server, 
  Play, 
  Square, 
  Users, 
  Wifi, 
  Copy, 
  QrCode,
  Smartphone,
  Monitor
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTeam } from '@/hooks/useTeam';

interface LocalHostSession {
  sessionId: string;
  pin: string;
  name: string;
  port: number;
  connectedClients: number;
  rundownId?: string;
  isActive: boolean;
}

const LocalHostMode = () => {
  const { toast } = useToast();
  const { team } = useTeam();
  const [isHosting, setIsHosting] = useState(false);
  const [hostSession, setHostSession] = useState<LocalHostSession | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const wsServerRef = useRef<any>(null);

  // Simulated local WebSocket server (in real implementation, this would use Capacitor native plugins)
  const startLocalServer = async () => {
    setIsStarting(true);
    
    try {
      // In a real implementation, this would start a native WebSocket server
      // using Capacitor plugins or native code
      const sessionId = crypto.randomUUID();
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      const port = 1234; // Default port for Cuer local sessions
      
      const session: LocalHostSession = {
        sessionId,
        pin,
        name: `${team?.name || 'Local'} Host`,
        port,
        connectedClients: 0,
        isActive: true
      };
      
      setHostSession(session);
      setIsHosting(true);
      
      toast({
        title: "Local host started",
        description: `Session PIN: ${pin} - Share this with team members`,
      });
      
      // Simulate periodic client updates
      const interval = setInterval(() => {
        setHostSession(prev => prev ? {
          ...prev,
          connectedClients: Math.floor(Math.random() * 5)
        } : null);
      }, 5000);
      
      wsServerRef.current = interval;
      
    } catch (error) {
      console.error('Failed to start local server:', error);
      toast({
        title: "Failed to start host",
        description: "Could not start local collaboration server",
        variant: "destructive"
      });
    } finally {
      setIsStarting(false);
    }
  };

  const stopLocalServer = () => {
    if (wsServerRef.current) {
      clearInterval(wsServerRef.current);
      wsServerRef.current = null;
    }
    
    setIsHosting(false);
    setHostSession(null);
    
    toast({
      title: "Local host stopped",
      description: "Collaboration server has been shut down",
    });
  };

  const copyPin = () => {
    if (hostSession) {
      navigator.clipboard.writeText(hostSession.pin);
      toast({
        title: "PIN copied",
        description: "Session PIN copied to clipboard"
      });
    }
  };

  const copyConnectionInfo = () => {
    if (hostSession) {
      const info = `Cuer Local Session\nPIN: ${hostSession.pin}\nHost: ${hostSession.name}`;
      navigator.clipboard.writeText(info);
      toast({
        title: "Connection info copied",
        description: "Session details copied to clipboard"
      });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsServerRef.current) {
        clearInterval(wsServerRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Local Host Mode
          </CardTitle>
          <CardDescription>
            Run this device as a local collaboration server for offline team sync
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {!isHosting ? (
            // Start hosting UI
            <div className="text-center py-8">
              <div className="flex justify-center items-center mb-4">
                <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800">
                  <Server className="h-12 w-12 text-muted-foreground" />
                </div>
              </div>
              
              <h3 className="font-medium mb-2">Ready to Host</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Start a local collaboration server that team members can connect to
              </p>
              
              <Button 
                onClick={startLocalServer}
                disabled={isStarting}
                size="lg"
              >
                <Play className="h-4 w-4 mr-2" />
                {isStarting ? 'Starting Host...' : 'Start Local Host'}
              </Button>
            </div>
          ) : (
            // Active hosting UI
            <div className="space-y-4">
              {/* Status indicator */}
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <div>
                    <div className="font-medium text-green-900 dark:text-green-100">
                      Hosting Active
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-200">
                      {hostSession?.connectedClients || 0} devices connected
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={stopLocalServer}
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop Host
                </Button>
              </div>
              
              {/* Session details */}
              {hostSession && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Session PIN</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-lg px-3 py-1">
                          {hostSession.pin}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={copyPin}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Share this PIN with team members
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Server Info</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div>Port: {hostSession.port}</div>
                        <div>Session: {hostSession.sessionId.slice(0, 8)}...</div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={copyConnectionInfo}
                        >
                          <QrCode className="h-4 w-4 mr-2" />
                          Copy Connection Info
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {/* Instructions */}
              <Alert>
                <Users className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">How team members can connect:</div>
                  <div className="text-sm space-y-1">
                    <div>1. Open Cuer on any device on the same Wi-Fi network</div>
                    <div>2. Go to a rundown and look for the local session indicator</div>
                    <div>3. Enter the session PIN: <span className="font-mono font-bold">{hostSession?.pin}</span></div>
                    <div>4. All changes will sync in real-time across connected devices</div>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LocalHostMode;