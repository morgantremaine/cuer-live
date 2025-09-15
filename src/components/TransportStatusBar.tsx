import React from 'react';
import TransportStatus from './transport/TransportStatus';
import LocalHostManager from './transport/LocalHostManager';
import SessionDiscoveryPanel from './SessionDiscoveryPanel';
import SmartTransportIndicator from './SmartTransportIndicator';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Wifi, Users, Activity } from 'lucide-react';
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
      {/* Smart Transport Indicator - shows health and allows manual switching */}
      <SmartTransportIndicator 
        rundownId={coreState.rundownId}
        showDetails={showEnhancedUI}
      />
      
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
          
          <Tabs defaultValue="discover" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="discover">
                <Wifi className="h-4 w-4 mr-2" />
                Discover
              </TabsTrigger>
              <TabsTrigger value="hosts">
                <Settings className="h-4 w-4 mr-2" />
                Host Manager
              </TabsTrigger>
              <TabsTrigger value="health">
                <Activity className="h-4 w-4 mr-2" />
                Health
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="discover" className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
                <div className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Looking to start a local session?
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-200">
                  Local session management has been moved to Account Settings → Collaboration for better team-wide control across all rundowns.
                </div>
              </div>
              
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
            
            <TabsContent value="health" className="space-y-4">
              <SmartTransportIndicator 
                rundownId={coreState.rundownId}
                showDetails={true}
              />
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