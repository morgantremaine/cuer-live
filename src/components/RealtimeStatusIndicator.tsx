
import React from 'react';
import ConnectionStatusBadge from './ConnectionStatusBadge';

interface RealtimeStatusIndicatorProps {
  isConnected: boolean;
  isProcessingUpdate: boolean;
  isProcessingLocalStructural?: boolean;
  className?: string;
}

const RealtimeStatusIndicator = ({ 
  isConnected, 
  isProcessingUpdate, 
  isProcessingLocalStructural,
  className 
}: RealtimeStatusIndicatorProps) => {
  // Combine both processing states for visual feedback
  const isProcessing = isProcessingUpdate || isProcessingLocalStructural;
  
  return (
    <ConnectionStatusBadge
      isConnected={isConnected}
      isProcessing={isProcessing}
      className={className}
      showLabel={true}
    />
  );
};

export default RealtimeStatusIndicator;
