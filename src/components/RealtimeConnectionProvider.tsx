
import React, { createContext, useContext, ReactNode } from 'react';

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
}

const RealtimeConnectionProvider = ({ 
  children, 
  isConnected, 
  isProcessingUpdate,
  isReconnecting = false
}: RealtimeConnectionProviderProps) => {
  return (
    <RealtimeConnectionContext.Provider 
      value={{ isConnected, isProcessingUpdate, isReconnecting }}
    >
      {children}
    </RealtimeConnectionContext.Provider>
  );
};

export default RealtimeConnectionProvider;
