import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, QrCode, Users, Wifi, WifiOff, Play, Square, Shield, AlertTriangle, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTeam } from '@/hooks/useTeam';
import { supabase } from '@/integrations/supabase/client';

interface LocalSession {
  sessionId: string;
  pin: string;
  name: string;
  websocketUrl: string;
  qrData: any;
  rundownId?: string;
  rundownTitle?: string;
}

interface Rundown {
  id: string;
  title: string;
}

const TeamLocalSessionManager = () => {
  const { toast } = useToast();
  const { userRole, team } = useTeam();
  
  const [activeSession, setActiveSession] = useState<LocalSession | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [allowedIPs, setAllowedIPs] = useState('');
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false);
  const [rundowns, setRundowns] = useState<Rundown[]>([]);
  const [selectedRundownId, setSelectedRundownId] = useState<string>('');
  const [isLoadingRundowns, setIsLoadingRundowns] = useState(false);

  // Check if user is admin
  const isTeamAdmin = userRole === 'admin';
  const teamName = team?.name || 'Unknown Team';

  // Load available rundowns when component mounts
  useEffect(() => {
    if (team?.id) {
      loadRundowns();
    }
  }, [team?.id]);

  const loadRundowns = async () => {
    if (!team?.id) return;
    
    setIsLoadingRundowns(true);
    try {
      const { data, error } = await supabase
        .from('rundowns')
        .select('id, title')
        .eq('team_id', team.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      setRundowns(data || []);
      
      // Select first rundown by default if none selected
      if (data && data.length > 0 && !selectedRundownId) {
        setSelectedRundownId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load rundowns:', error);
      toast({
        title: "Failed to load rundowns",
        description: "Could not load team rundowns. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingRundowns(false);
    }
  };

  const createLocalSession = async () => {
    if (!selectedRundownId) {
      toast({
        title: "No rundown selected",
        description: "Please select a rundown for the local session",
        variant: "destructive"
      });
      return;
    }

    if (!isTeamAdmin) {
      toast({
        title: "Permission denied",
        description: "Only team administrators can start local sessions",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingSession(true);
    
    try {
      const selectedRundown = rundowns.find(r => r.id === selectedRundownId);
      
      const response = await supabase.functions.invoke('cuer-local-host', {
        body: {
          name: sessionName || `${selectedRundown?.title || 'Rundown'} Session`,
          teamId: team?.id,
          rundownId: selectedRundownId,
          allowedIPs: allowedIPs ? allowedIPs.split(',').map(ip => ip.trim()) : []
        }
      });

      if (response.error) throw response.error;
      
      const session = {
        ...response.data,
        rundownId: selectedRundownId,
        rundownTitle: selectedRundown?.title
      } as LocalSession;
      
      setActiveSession(session);
      setIsStartDialogOpen(false);
      
      toast({
        title: "Local session started",
        description: `Session "${session.name}" is now active with PIN ${session.pin}`,
      });
      
    } catch (error) {
      console.error('Failed to create local session:', error);
      toast({
        title: "Failed to start session",
        description: "Could not create local session. Please check your connection.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingSession(false);
    }
  };

  const endLocalSession = async () => {
    if (!activeSession) return;
    
    try {
      await supabase.functions.invoke('cuer-local-host', {
        body: { sessionId: activeSession.sessionId },
        method: 'DELETE'
      });
      
      setActiveSession(null);
      
      toast({
        title: "Session ended",
        description: "Local session has been terminated"
      });
      
    } catch (error) {
      console.error('Failed to end session:', error);
      toast({
        title: "Error ending session",
        description: "Session may still be active on the server",
        variant: "destructive"
      });
    }
  };

  const copySessionPin = () => {
    if (activeSession) {
      navigator.clipboard.writeText(activeSession.pin);
      toast({
        title: "PIN copied",
        description: "Session PIN has been copied to clipboard"
      });
    }
  };

  const copyQRData = () => {
    if (activeSession) {
      navigator.clipboard.writeText(JSON.stringify(activeSession.qrData, null, 2));
      toast({
        title: "QR data copied",
        description: "Session QR data copied to clipboard"
      });
    }
  };

  const copyWebSocketUrl = () => {
    if (activeSession) {
      navigator.clipboard.writeText(activeSession.websocketUrl);
      toast({
        title: "WebSocket URL copied",
        description: "Connection URL copied to clipboard"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Team Local Collaboration Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Team Local Collaboration
          </CardTitle>
          <CardDescription>
            Start local sessions for offline collaboration across all your team's rundowns. 
            Team members can join using session PINs even when internet is unavailable.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Admin Permission Check */}
          {!isTeamAdmin ? (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Only team administrators can start local sessions. You are currently a <strong>{userRole || 'member'}</strong> in <strong>{teamName}</strong>.
                {userRole === 'member' && ' Contact your team admin to start a local session.'}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                You have administrator privileges and can start local sessions for <strong>{teamName}</strong>.
              </AlertDescription>
            </Alert>
          )}

          {!activeSession ? (
            // Start session UI
            <div className="space-y-4">
              <div className="text-center py-8">
                <WifiOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <div className="font-medium mb-2">No Local Session Active</div>
                <div className="text-sm text-muted-foreground mb-4">
                  Start a local session to enable real-time collaboration without internet
                </div>
                
                <Dialog open={isStartDialogOpen} onOpenChange={setIsStartDialogOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={!isTeamAdmin}>
                      <Play className="h-4 w-4 mr-2" />
                      {isTeamAdmin ? 'Start Local Session' : 'Admin Access Required'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Start Local Session</DialogTitle>
                      <DialogDescription>
                        Configure your local collaboration session. Team members will use the generated PIN to join.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="rundown-select">Select Rundown</Label>
                        <Select 
                          value={selectedRundownId} 
                          onValueChange={setSelectedRundownId}
                          disabled={isLoadingRundowns}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingRundowns ? "Loading rundowns..." : "Choose a rundown"} />
                          </SelectTrigger>
                          <SelectContent>
                            {rundowns.map((rundown) => (
                              <SelectItem key={rundown.id} value={rundown.id}>
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  {rundown.title}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {rundowns.length === 0 && !isLoadingRundowns && (
                          <div className="text-xs text-muted-foreground mt-1">
                            No rundowns found. Create a rundown first to start a local session.
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="session-name">Session Name</Label>
                        <Input
                          id="session-name"
                          placeholder="Team Collaboration Session"
                          value={sessionName}
                          onChange={(e) => setSessionName(e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="allowed-ips">Allowed IP Addresses (Optional)</Label>
                        <Textarea
                          id="allowed-ips"
                          placeholder="192.168.1.100, 10.0.0.50&#10;(Leave empty to allow all local network IPs)"
                          value={allowedIPs}
                          onChange={(e) => setAllowedIPs(e.target.value)}
                          rows={3}
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          Comma-separated list. Local network IPs (192.168.x.x, 10.x.x.x) are allowed by default.
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setIsStartDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={createLocalSession}
                          disabled={isCreatingSession || !selectedRundownId}
                        >
                          {isCreatingSession ? 'Starting...' : 'Start Session'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ) : (
            // Active session UI
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <div>
                    <div className="font-medium text-green-900 dark:text-green-100">
                      {activeSession.name}
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-200">
                      Active for: {activeSession.rundownTitle || 'Unknown Rundown'}
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={endLocalSession}
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  <Square className="h-4 w-4 mr-2" />
                  End Session
                </Button>
              </div>
              
              {/* Session details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Session PIN</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-lg px-3 py-1">
                        {activeSession.pin}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={copySessionPin}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Share this PIN with team members to join the session
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Connection Info</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={copyWebSocketUrl}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy WebSocket URL
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={copyQRData}
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        Copy QR Code Data
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Instructions */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  How Team Members Can Join
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
                  <div>1. Open Cuer on any device connected to the same network</div>
                  <div>2. Navigate to the same rundown: <span className="font-medium">{activeSession.rundownTitle}</span></div>
                  <div>3. Click the network settings icon when the session is discovered</div>
                  <div>4. Enter the session PIN: <span className="font-mono font-bold">{activeSession.pin}</span></div>
                  <div>5. All changes will sync in real-time across all connected devices</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamLocalSessionManager;