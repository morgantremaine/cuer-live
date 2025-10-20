import React from 'react';
import { useRealtimeConnection } from './RealtimeConnectionProvider';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface RealtimeConnectionStatusProps {
  className?: string;
}

const RealtimeConnectionStatus = ({ className }: RealtimeConnectionStatusProps) => {
  const { isConnected, isProcessingUpdate } = useRealtimeConnection();

  // Determine status
  const status = !isConnected ? 'disconnected' : isProcessingUpdate ? 'syncing' : 'connected';

  // Status colors
  const statusConfig = {
    connected: {
      color: 'bg-green-500',
      text: 'Connected',
      description: 'Real-time updates are working'
    },
    syncing: {
      color: 'bg-yellow-500 animate-pulse',
      text: 'Syncing',
      description: 'Synchronizing changes...'
    },
    disconnected: {
      color: 'bg-red-500 animate-pulse',
      text: 'Disconnected',
      description: 'Reconnecting... Please wait'
    }
  };

  const config = statusConfig[status];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-2', className)}>
            <div className={cn('w-2 h-2 rounded-full', config.color)} />
            <span className="text-xs text-muted-foreground">{config.text}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default RealtimeConnectionStatus;
