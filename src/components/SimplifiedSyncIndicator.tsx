import React from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimplifiedSyncIndicatorProps {
  isConnected: boolean;
  isProcessing?: boolean;
  lastSyncTime?: string | null;
  className?: string;
}

const SimplifiedSyncIndicator = ({ 
  isConnected, 
  isProcessing = false, 
  lastSyncTime,
  className 
}: SimplifiedSyncIndicatorProps) => {
  const getStatusColor = () => {
    if (!isConnected) return 'text-destructive';
    if (isProcessing) return 'text-primary';
    return 'text-success';
  };

  const getStatusIcon = () => {
    if (isProcessing) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (!isConnected) {
      return <WifiOff className="h-4 w-4" />;
    }
    return <Wifi className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (!isConnected) return 'Disconnected';
    if (isProcessing) return 'Syncing...';
    return 'Connected';
  };

  return (
    <div className={cn(
      'flex items-center space-x-2 text-sm',
      getStatusColor(),
      className
    )}>
      {getStatusIcon()}
      <span>{getStatusText()}</span>
      {lastSyncTime && isConnected && !isProcessing && (
        <span className="text-xs text-muted-foreground">
          {new Date(lastSyncTime).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

export default SimplifiedSyncIndicator;