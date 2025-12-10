
import React, { createContext, useContext, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RealtimeConnectionContextType {
  isConnected: boolean;
  isProcessingUpdate: boolean;
  isReconnecting: boolean;
}

const RealtimeConnectionContext = createContext<RealtimeConnectionContextType>({
  isConnected: false,
  isProcessingUpdate: false,
  isReconnecting: false
});

export const useRealtimeConnection = () => {
  return useContext(RealtimeConnectionContext);
};

interface RealtimeConnectionProviderProps {
  children: ReactNode;
  isConnected: boolean;
  isProcessingUpdate: boolean;
  isReconnecting?: boolean;
  showConnectionWarning?: boolean;
  onManualRetry?: () => void;
}

const RealtimeConnectionProvider = ({ 
  children, 
  isConnected, 
  isProcessingUpdate,
  isReconnecting = false,
  showConnectionWarning = false,
  onManualRetry
}: RealtimeConnectionProviderProps) => {
  return (
    <RealtimeConnectionContext.Provider 
      value={{ isConnected, isProcessingUpdate, isReconnecting }}
    >
      {/* Connection Warning Banner */}
      {showConnectionWarning && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>Connection issues detected - syncing may be delayed</span>
          </div>
          {onManualRetry && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onManualRetry}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </div>
      )}
      {children}
    </RealtimeConnectionContext.Provider>
  );
};

export default RealtimeConnectionProvider;
