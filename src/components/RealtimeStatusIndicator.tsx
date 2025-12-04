import React from 'react';
import ConnectionStatusBadge from './ConnectionStatusBadge';
import { useBroadcastHealthMonitor } from '@/hooks/useBroadcastHealthMonitor';
import { useConnectionHealth } from '@/hooks/useConnectionHealth';
import { AlertTriangle } from 'lucide-react';

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
  const connectionHealth = useConnectionHealth(rundownId || null);
  
  // Determine connection quality - use unified health when available
  const isHealthy = broadcastHealth.isHealthy && connectionHealth.isFullyConnected;
  const isDegraded = isConnected && (!isHealthy || connectionHealth.isDegraded);
  
  return (
    <div className="flex items-center gap-2">
      {/* Connection warning banner */}
      {connectionHealth.showWarning && connectionHealth.warningMessage && (
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
          connectionHealth.health.consecutiveGlobalFailures >= 7 
            ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
        }`}>
          <AlertTriangle className="h-3 w-3" />
          <span>{connectionHealth.warningMessage}</span>
        </div>
      )}
      
      <ConnectionStatusBadge
        isConnected={isConnected}
        isProcessing={isProcessingUpdate}
        isDegraded={isDegraded}
        isReconnecting={broadcastHealth.isReconnecting}
        className={className}
        showLabel={true}
      />
    </div>
  );
};

export default RealtimeStatusIndicator;
