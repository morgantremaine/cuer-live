
import React from 'react';
import ConnectionStatusBadge from './ConnectionStatusBadge';
import { useBroadcastHealthMonitor } from '@/hooks/useBroadcastHealthMonitor';

interface RealtimeStatusIndicatorProps {
  isConnected: boolean;
  isProcessingUpdate: boolean;
  rundownId?: string;
  className?: string;
}

const RealtimeStatusIndicator = ({ 
  isConnected, 
  isProcessingUpdate,
  rundownId,
  className 
}: RealtimeStatusIndicatorProps) => {
  const broadcastHealth = useBroadcastHealthMonitor(rundownId || '', !!rundownId);
  
  // Determine connection quality
  const isHealthy = broadcastHealth.isHealthy;
  const isDegraded = isConnected && !isHealthy;
  
  return (
    <ConnectionStatusBadge
      isConnected={isConnected}
      isProcessing={isProcessingUpdate}
      isDegraded={isDegraded}
      className={className}
      showLabel={true}
    />
  );
};

export default RealtimeStatusIndicator;
