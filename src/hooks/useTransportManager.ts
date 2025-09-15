import { useState, useEffect, useCallback, useRef } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export interface TransportConfig {
  mode: 'cloud' | 'local' | 'offline';
  isConnected: boolean;
  cloudUrl?: string;
  localHostUrl?: string;
  sessionPin?: string;
  reconnectAttempts: number;
}

export interface LocalHostInfo {
  url: string;
  name: string;
  version: string;
  sessionPin: string;
  isAvailable: boolean;
}

export const useTransportManager = () => {
  const { isConnected: isNetworkConnected } = useNetworkStatus();
  
  const [transport, setTransport] = useState<TransportConfig>({
    mode: 'offline',
    isConnected: false,
    reconnectAttempts: 0
  });
  
  const [availableHosts, setAvailableHosts] = useState<LocalHostInfo[]>([]);
  const discoveryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // mDNS simulation - discover local hosts
  const discoverLocalHosts = useCallback(async (): Promise<LocalHostInfo[]> => {
    console.log('🔍 Discovering local Cuer hosts...');
    
    const hosts: LocalHostInfo[] = [];
    
    // Check common local network addresses
    const commonPorts = [1234, 8080, 3001, 4000];
    const baseIPs = ['localhost', '192.168.1', '192.168.0', '10.0.0'];
    
    const checkPromises: Promise<void>[] = [];
    
    // Check localhost
    for (const port of commonPorts) {
      const url = `ws://localhost:${port}`;
      checkPromises.push(
        checkHostAvailability(url).then(info => {
          if (info) hosts.push(info);
        }).catch(() => {})
      );
    }
    
    // Check saved local hosts
    const savedHosts = JSON.parse(localStorage.getItem('cuer-saved-hosts') || '[]');
    for (const savedHost of savedHosts) {
      checkPromises.push(
        checkHostAvailability(savedHost.url).then(info => {
          if (info) hosts.push(info);
        }).catch(() => {})
      );
    }
    
    await Promise.allSettled(checkPromises);
    
    console.log(`🔍 Found ${hosts.length} available local hosts`);
    return hosts;
  }, []);

  // Check if a specific host is available
  const checkHostAvailability = async (url: string): Promise<LocalHostInfo | null> => {
    try {
      const response = await fetch(`${url.replace('ws://', 'http://')}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const info = await response.json();
        return {
          url,
          name: info.name || 'Cuer Host',
          version: info.version || '1.0.0',
          sessionPin: info.sessionPin || '',
          isAvailable: true
        };
      }
    } catch (error) {
      // Host not available
    }
    
    return null;
  };

  // Start discovery interval
  useEffect(() => {
    const startDiscovery = () => {
      // Initial discovery
      discoverLocalHosts().then(setAvailableHosts);
      
      // Periodic discovery every 30 seconds
      discoveryIntervalRef.current = setInterval(() => {
        discoverLocalHosts().then(setAvailableHosts);
      }, 30000);
    };
    
    startDiscovery();
    
    return () => {
      if (discoveryIntervalRef.current) {
        clearInterval(discoveryIntervalRef.current);
      }
    };
  }, [discoverLocalHosts]);

  // Smart transport selection
  const selectBestTransport = useCallback((): TransportConfig => {
    console.log('🎯 Selecting best transport...');
    
    // Priority 1: Cloud if network is available
    if (isNetworkConnected) {
      return {
        mode: 'cloud',
        isConnected: false, // Will be set when connection establishes
        cloudUrl: 'wss://khdiwrkgahsbjszlwnob.supabase.co/realtime/v1/websocket',
        reconnectAttempts: 0
      };
    }
    
    // Priority 2: Local host if available
    const availableHost = availableHosts.find(host => host.isAvailable);
    if (availableHost) {
      return {
        mode: 'local',
        isConnected: false, // Will be set when connection establishes
        localHostUrl: availableHost.url,
        sessionPin: availableHost.sessionPin,
        reconnectAttempts: 0
      };
    }
    
    // Priority 3: Offline mode
    return {
      mode: 'offline',
      isConnected: false,
      reconnectAttempts: 0
    };
  }, [isNetworkConnected, availableHosts]);

  // Auto-switch transport when conditions change
  useEffect(() => {
    const newTransport = selectBestTransport();
    
    // Only update if mode changes to avoid unnecessary reconnections
    if (newTransport.mode !== transport.mode) {
      console.log(`🔄 Transport switching: ${transport.mode} → ${newTransport.mode}`);
      setTransport(newTransport);
    }
  }, [isNetworkConnected, availableHosts, transport.mode, selectBestTransport]);

  // Reconnection logic with backoff
  const attemptReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    const backoffDelay = Math.min(1000 * Math.pow(2, transport.reconnectAttempts), 30000);
    
    console.log(`🔄 Reconnecting in ${backoffDelay}ms (attempt ${transport.reconnectAttempts + 1})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      setTransport(prev => ({
        ...selectBestTransport(),
        reconnectAttempts: prev.reconnectAttempts + 1
      }));
    }, backoffDelay);
  }, [transport.reconnectAttempts, selectBestTransport]);

  // Connection status updates
  const updateConnectionStatus = useCallback((isConnected: boolean) => {
    setTransport(prev => ({
      ...prev,
      isConnected,
      reconnectAttempts: isConnected ? 0 : prev.reconnectAttempts
    }));
    
    // If disconnected, attempt reconnect
    if (!isConnected && transport.mode !== 'offline') {
      attemptReconnect();
    }
  }, [transport.mode, attemptReconnect]);

  // Manual host management
  const addSavedHost = useCallback((url: string, name: string) => {
    const savedHosts = JSON.parse(localStorage.getItem('cuer-saved-hosts') || '[]');
    const newHost = { url, name };
    
    if (!savedHosts.find((h: any) => h.url === url)) {
      savedHosts.push(newHost);
      localStorage.setItem('cuer-saved-hosts', JSON.stringify(savedHosts));
      
      // Trigger rediscovery
      discoverLocalHosts().then(setAvailableHosts);
    }
  }, [discoverLocalHosts]);

  const removeSavedHost = useCallback((url: string) => {
    const savedHosts = JSON.parse(localStorage.getItem('cuer-saved-hosts') || '[]');
    const filtered = savedHosts.filter((h: any) => h.url !== url);
    localStorage.setItem('cuer-saved-hosts', JSON.stringify(filtered));
    
    // Trigger rediscovery
    discoverLocalHosts().then(setAvailableHosts);
  }, [discoverLocalHosts]);

  // Force specific transport mode
  const forceTransportMode = useCallback((mode: 'cloud' | 'local' | 'offline', options?: {
    localHostUrl?: string;
    sessionPin?: string;
  }) => {
    console.log('🎯 Forcing transport mode:', mode);
    
    if (mode === 'local' && options?.localHostUrl) {
      setTransport({
        mode: 'local',
        isConnected: false,
        localHostUrl: options.localHostUrl,
        sessionPin: options.sessionPin,
        reconnectAttempts: 0
      });
    } else {
      setTransport({
        mode,
        isConnected: false,
        reconnectAttempts: 0
      });
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (discoveryIntervalRef.current) {
        clearInterval(discoveryIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    transport,
    availableHosts,
    isNetworkConnected,
    
    // Actions
    updateConnectionStatus,
    addSavedHost,
    removeSavedHost,
    forceTransportMode,
    attemptReconnect: () => attemptReconnect(),
    
    // Utils
    selectBestTransport
  };
};