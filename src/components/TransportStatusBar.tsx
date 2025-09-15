import React from 'react';
import TransportStatus from './transport/TransportStatus';
import LocalHostManager from './transport/LocalHostManager';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings } from 'lucide-react';
import { useTransportManager } from '@/hooks/useTransportManager';

const TransportStatusBar = () => {
  const { transport } = useTransportManager();
  const [isManagerOpen, setIsManagerOpen] = React.useState(false);

  // Only show if not in cloud mode
  if (transport.mode === 'cloud' && transport.isConnected) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      <TransportStatus transport={transport} />
      
      <Dialog open={isManagerOpen} onOpenChange={setIsManagerOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Local Network Settings</DialogTitle>
          </DialogHeader>
          <LocalHostManager />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransportStatusBar;