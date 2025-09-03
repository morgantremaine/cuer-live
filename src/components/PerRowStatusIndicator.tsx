import React from 'react';
import { usePerRowFeatureFlag } from '@/hooks/usePerRowFeatureFlag';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';

interface PerRowStatusIndicatorProps {
  isConnected?: boolean;
  isSaving?: boolean;
  className?: string;
}

export const PerRowStatusIndicator: React.FC<PerRowStatusIndicatorProps> = ({
  isConnected = false,
  isSaving = false,
  className = ''
}) => {
  const { isEnabled } = usePerRowFeatureFlag();

  if (!isEnabled) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge 
        variant={isConnected ? 'default' : 'secondary'}
        className="text-xs"
      >
        {isConnected ? (
          <Wifi className="w-3 h-3 mr-1" />
        ) : (
          <WifiOff className="w-3 h-3 mr-1" />
        )}
        Per-row {isConnected ? 'Connected' : 'Disconnected'}
      </Badge>
      
      {isSaving && (
        <Badge variant="outline" className="text-xs animate-pulse">
          Saving...
        </Badge>
      )}
    </div>
  );
};

export default PerRowStatusIndicator;