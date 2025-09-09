
import React from 'react';
import ConnectionStatusBadge from './ConnectionStatusBadge';
import { LiveShowProtectionMode } from './LiveShowProtectionMode';

interface RealtimeStatusIndicatorProps {
  isConnected: boolean;
  isProcessingUpdate: boolean;
  className?: string;
}

const RealtimeStatusIndicator = ({ 
  isConnected, 
  isProcessingUpdate, 
  className 
}: RealtimeStatusIndicatorProps) => {
  return (
    <div className="flex items-center gap-2">
      <ConnectionStatusBadge
        isConnected={isConnected}
        isProcessing={isProcessingUpdate}
        className={className}
        showLabel={true}
      />
      <LiveShowProtectionMode />
    </div>
  );
};

export default RealtimeStatusIndicator;
