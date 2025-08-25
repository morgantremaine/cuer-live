
import React, { createContext, useContext, ReactNode } from 'react';

interface RealtimeConnectionContextType {
  isConnected: boolean;
  isProcessingUpdate: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  lastHeartbeat: number | null;
}

const RealtimeConnectionContext = createContext<RealtimeConnectionContextType>({
  isConnected: false,
  isProcessingUpdate: false,
  connectionQuality: 'disconnected',
  lastHeartbeat: null
});

export const useRealtimeConnection = () => {
  return useContext(RealtimeConnectionContext);
};

interface RealtimeConnectionProviderProps {
  children: ReactNode;
  isConnected: boolean;
  isProcessingUpdate: boolean;
  connectionQuality?: 'excellent' | 'good' | 'poor' | 'disconnected';
  lastHeartbeat?: number | null;
}

const RealtimeConnectionProvider = ({ 
  children, 
  isConnected, 
  isProcessingUpdate,
  connectionQuality = isConnected ? 'good' : 'disconnected',
  lastHeartbeat = null
}: RealtimeConnectionProviderProps) => {
  return (
    <RealtimeConnectionContext.Provider 
      value={{ 
        isConnected, 
        isProcessingUpdate, 
        connectionQuality,
        lastHeartbeat 
      }}
    >
      {children}
    </RealtimeConnectionContext.Provider>
  );
};

export default RealtimeConnectionProvider;
