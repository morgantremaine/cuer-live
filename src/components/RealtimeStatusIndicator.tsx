
import React from 'react';
import ConnectionStatusBadge from './ConnectionStatusBadge';

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
    <ConnectionStatusBadge
      isConnected={isConnected}
      isProcessing={isProcessingUpdate}
      className={className}
      showLabel={true}
    />
  );
};

export default RealtimeStatusIndicator;
