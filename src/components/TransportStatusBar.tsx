import React from 'react';
import TransportStatus from './transport/TransportStatus';
import LocalHostManager from './transport/LocalHostManager';
import LocalSessionManager from './LocalSessionManager';
import SessionDiscoveryPanel from './SessionDiscoveryPanel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Wifi, Users } from 'lucide-react';
import { useTransportManager } from '@/hooks/useTransportManager';
import { useRundownStateCoordination } from '@/hooks/useRundownStateCoordination';

const TransportStatusBar = () => {
  const { transport } = useTransportManager();
  const { coreState } = useRundownStateCoordination();
  const [isManagerOpen, setIsManagerOpen] = React.useState(false);

  // Show enhanced UI when not in standard cloud mode
  const showEnhancedUI = transport.mode !== 'cloud' || !transport.isConnected;

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      <TransportStatus transport={transport} />
      
      <Dialog open={isManagerOpen} onOpenChange={setIsManagerOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {showEnhancedUI ? <Wifi className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Network & Collaboration Settings
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="sessions" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sessions" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Local Sessions
              </TabsTrigger>
              <TabsTrigger value="discover">
                <Wifi className="h-4 w-4 mr-2" />
                Discover
              </TabsTrigger>
              <TabsTrigger value="hosts">
                <Settings className="h-4 w-4 mr-2" />
                Host Manager
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="sessions" className="space-y-4">
              <LocalSessionManager 
                rundownId={coreState.rundownId}
                rundownTitle={coreState.rundownTitle}
                teamId={undefined} // Add team support later
                onSessionStart={(session) => {
                  console.log('Session started:', session);
                  // Here you would integrate with the CRDT sync system
                }}
                onSessionEnd={() => {
                  console.log('Session ended');
                }}
              />
            </TabsContent>
            
            <TabsContent value="discover" className="space-y-4">
              <SessionDiscoveryPanel 
                onSessionConnect={(websocketUrl, session) => {
                  console.log('Connecting to session:', session, 'via', websocketUrl);
                  // Here you would connect the CRDT sync to the discovered session
                  setIsManagerOpen(false);
                }}
              />
            </TabsContent>
            
            <TabsContent value="hosts" className="space-y-4">
              <LocalHostManager />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {transport.mode === 'offline' && (
        <div className="text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded border">
          Offline Mode
        </div>
      )}
    </div>
  );
};

export default TransportStatusBar;