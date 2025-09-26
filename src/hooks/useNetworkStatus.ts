import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  isConnected: boolean;
  connectionType: 'online' | 'offline' | 'reconnecting';
  reconnectAttempts: number;
  lastOnline: Date | null;
  offlineSince: Date | null;
  totalOfflineDuration: number; // milliseconds of total offline time
}

export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isConnected: navigator.onLine,
    connectionType: navigator.onLine ? 'online' : 'offline',
    reconnectAttempts: 0,
    lastOnline: navigator.onLine ? new Date() : null,
    offlineSince: navigator.onLine ? null : new Date(),
    totalOfflineDuration: 0
  });

  const [reconnectTimeout, setReconnectTimeout] = useState<NodeJS.Timeout | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      // Test actual connectivity by making a request to Supabase
      const response = await fetch('https://khdiwrkgahsbjszlwnob.supabase.co/rest/v1/', {
        method: 'HEAD',
        mode: 'no-cors'
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const handleOnline = useCallback(async () => {
    console.log('📡 Network: online event detected');
    
    // Calculate offline duration if we were offline
    const now = new Date();
    
    // Verify actual connectivity
    const isActuallyOnline = await checkConnection();
    
    setNetworkStatus(prev => {
      const offlineDuration = prev.offlineSince ? now.getTime() - prev.offlineSince.getTime() : 0;
      const newTotalOfflineDuration = prev.totalOfflineDuration + offlineDuration;
      
      if (offlineDuration > 0) {
        console.log(`📡 Network: Was offline for ${Math.round(offlineDuration / 1000)}s, total: ${Math.round(newTotalOfflineDuration / 1000)}s`);
      }
      
      return {
        ...prev,
        isOnline: true,
        isConnected: isActuallyOnline,
        connectionType: isActuallyOnline ? 'online' : 'reconnecting',
        lastOnline: now,
        offlineSince: isActuallyOnline ? null : prev.offlineSince,
        totalOfflineDuration: isActuallyOnline ? newTotalOfflineDuration : prev.totalOfflineDuration,
        reconnectAttempts: isActuallyOnline ? 0 : prev.reconnectAttempts
      };
    });

    if (!isActuallyOnline) {
      // Start reconnection attempts
      attemptReconnection();
    }
  }, [checkConnection]);

  const handleOffline = useCallback(() => {
    console.log('📡 Network: offline event detected');
    
    const now = new Date();
    
    setNetworkStatus(prev => ({
      ...prev,
      isOnline: false,
      isConnected: false,
      connectionType: 'offline',
      offlineSince: prev.offlineSince || now // Only set if not already offline
    }));

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      setReconnectTimeout(null);
    }
  }, [reconnectTimeout]);

  const attemptReconnection = useCallback(() => {
    const timeout = setTimeout(async () => {
      setNetworkStatus(prev => ({
        ...prev,
        connectionType: 'reconnecting',
        reconnectAttempts: prev.reconnectAttempts + 1
      }));

      const isConnected = await checkConnection();
      
      if (isConnected) {
        setNetworkStatus(prev => {
          const now = new Date();
          const offlineDuration = prev.offlineSince ? now.getTime() - prev.offlineSince.getTime() : 0;
          const newTotalOfflineDuration = prev.totalOfflineDuration + offlineDuration;
          
          if (offlineDuration > 0) {
            console.log(`📡 Network: Reconnected after ${Math.round(offlineDuration / 1000)}s offline`);
          }
          
          return {
            ...prev,
            isConnected: true,
            connectionType: 'online',
            reconnectAttempts: 0,
            offlineSince: null,
            totalOfflineDuration: newTotalOfflineDuration,
            lastOnline: now
          };
        });
        setReconnectTimeout(null);
      } else {
        // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
        const delay = Math.min(Math.pow(2, networkStatus.reconnectAttempts) * 1000, 30000);
        console.log(`📡 Network: reconnection failed, retrying in ${delay}ms`);
        
        setReconnectTimeout(setTimeout(attemptReconnection, delay));
      }
    }, 1000);

    setReconnectTimeout(timeout);
  }, [checkConnection, networkStatus.reconnectAttempts]);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connection check
    checkConnection().then(isConnected => {
      setNetworkStatus(prev => ({
        ...prev,
        isConnected,
        connectionType: isConnected ? 'online' : 'reconnecting'
      }));

      if (!isConnected && navigator.onLine) {
        attemptReconnection();
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [handleOnline, handleOffline, checkConnection, attemptReconnection, reconnectTimeout]);

  return {
    ...networkStatus,
    checkConnection,
    forceReconnect: attemptReconnection
  };
};