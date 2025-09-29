
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
  
  // Show degraded state if using fallback due to poor broadcast health
  const effectiveConnection = isConnected && broadcastHealth.isHealthy;
  
  return (
    <ConnectionStatusBadge
      isConnected={effectiveConnection}
      isProcessing={isProcessingUpdate}
      className={className}
      showLabel={true}
    />
  );
};

export default RealtimeStatusIndicator;
