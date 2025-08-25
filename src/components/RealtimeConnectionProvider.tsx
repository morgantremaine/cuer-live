
import React, { createContext, useContext, ReactNode } from 'react';

interface RealtimeConnectionContextType {
  isConnected: boolean;
  isProcessingUpdate: boolean;
  isProcessingLocalStructural?: boolean;
}

const RealtimeConnectionContext = createContext<RealtimeConnectionContextType>({
  isConnected: false,
  isProcessingUpdate: false,
  isProcessingLocalStructural: false
});

export const useRealtimeConnection = () => {
  return useContext(RealtimeConnectionContext);
};

interface RealtimeConnectionProviderProps {
  children: ReactNode;
  isConnected: boolean;
  isProcessingUpdate: boolean;
  isProcessingLocalStructural?: boolean;
}

const RealtimeConnectionProvider = ({ 
  children, 
  isConnected, 
  isProcessingUpdate,
  isProcessingLocalStructural 
}: RealtimeConnectionProviderProps) => {
  return (
    <RealtimeConnectionContext.Provider 
      value={{ isConnected, isProcessingUpdate, isProcessingLocalStructural }}
    >
      {children}
    </RealtimeConnectionContext.Provider>
  );
};

export default RealtimeConnectionProvider;
