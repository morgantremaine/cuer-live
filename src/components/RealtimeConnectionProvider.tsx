
import React, { createContext, useContext, ReactNode } from 'react';

interface RealtimeConnectionContextType {
  isConnected: boolean;
  isProcessingUpdate: boolean;
}

const RealtimeConnectionContext = createContext<RealtimeConnectionContextType>({
  isConnected: false,
  isProcessingUpdate: false
});

export const useRealtimeConnection = () => {
  return useContext(RealtimeConnectionContext);
};

interface RealtimeConnectionProviderProps {
  children: ReactNode;
  isConnected: boolean;
  isProcessingUpdate: boolean;
}

const RealtimeConnectionProvider = ({ 
  children, 
  isConnected, 
  isProcessingUpdate 
}: RealtimeConnectionProviderProps) => {
  return (
    <RealtimeConnectionContext.Provider 
      value={{ isConnected, isProcessingUpdate }}
    >
      {children}
    </RealtimeConnectionContext.Provider>
  );
};

export default RealtimeConnectionProvider;
