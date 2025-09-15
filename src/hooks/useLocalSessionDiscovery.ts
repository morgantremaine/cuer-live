import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DiscoveredSession {
  id: string;
  name: string;
  clientCount: number;
  createdAt: number;
  host: {
    url: string;
    name: string;
    version: string;
    capabilities: string[];
  };
}

export interface SessionDiscoveryState {
  isScanning: boolean;
  discoveredSessions: DiscoveredSession[];
  lastScan: number;
  error: string | null;
}

export const useLocalSessionDiscovery = (enabled: boolean = true) => {
  const [state, setState] = useState<SessionDiscoveryState>({
    isScanning: false,
    discoveredSessions: [],
    lastScan: 0,
    error: null
  });
  
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Discover sessions from various sources
  const discoverSessions = useCallback(async (): Promise<DiscoveredSession[]> => {
    const sessions: DiscoveredSession[] = [];
    
    // 1. Check Supabase Edge Function (local host emulation)
    try {
      const { data, error } = await supabase.functions.invoke('cuer-local-host/discover');
      
      if (!error && data?.sessions) {
        const hostInfo = data.host || {
          name: 'Cuer Cloud Host',
          version: '1.0.0',
          capabilities: ['yjs-sync']
        };
        
        data.sessions.forEach((session: any) => {
          sessions.push({
            id: session.id,
            name: session.name,
            clientCount: session.clientCount || 0,
            createdAt: session.createdAt,
            host: {
              url: 'https://khdiwrkgahsbjszlwnob.supabase.co/functions/v1/cuer-local-host',
              name: hostInfo.name,
              version: hostInfo.version,
              capabilities: hostInfo.capabilities
            }
          });
        });
      }
    } catch (error) {
      console.log('No cloud sessions available');
    }
    
    // 2. Check saved local hosts from localStorage
    const savedHosts = JSON.parse(localStorage.getItem('cuer-saved-hosts') || '[]');
    
    const hostChecks = savedHosts.map(async (savedHost: any) => {
      try {
        const response = await fetch(`${savedHost.url}/discover`, {
          method: 'GET',
          signal: abortControllerRef.current?.signal,
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.sessions) {
            data.sessions.forEach((session: any) => {
              sessions.push({
                id: session.id,
                name: session.name,
                clientCount: session.clientCount || 0,
                createdAt: session.createdAt,
                host: {
                  url: savedHost.url,
                  name: data.host?.name || savedHost.name,
                  version: data.host?.version || '1.0.0',
                  capabilities: data.host?.capabilities || []
                }
              });
            });
          }
        }
      } catch (error) {
        console.log(`Host ${savedHost.url} not available`);
      }
    });
    
    await Promise.allSettled(hostChecks);
    
    // 3. Simulate mDNS discovery for common local addresses
    const commonHosts = [
      'http://localhost:1234',
      'http://localhost:8080',
      'http://192.168.1.100:1234',
      'http://10.0.0.100:1234'
    ];
    
    const mdnsChecks = commonHosts.map(async (hostUrl) => {
      try {
        const response = await fetch(`${hostUrl}/discover`, {
          method: 'GET',
          signal: AbortSignal.timeout(1000), // Quick timeout for discovery
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.sessions) {
            data.sessions.forEach((session: any) => {
              // Don't add duplicates
              if (!sessions.find(s => s.id === session.id)) {
                sessions.push({
                  id: session.id,
                  name: session.name,
                  clientCount: session.clientCount || 0,
                  createdAt: session.createdAt,
                  host: {
                    url: hostUrl,
                    name: data.host?.name || 'Local Cuer Host',
                    version: data.host?.version || '1.0.0',
                    capabilities: data.host?.capabilities || []
                  }
                });
              }
            });
          }
        }
      } catch (error) {
        // Host not available, which is expected
      }
    });
    
    await Promise.allSettled(mdnsChecks);
    
    return sessions;
  }, []);

  // Perform a single scan
  const scan = useCallback(async () => {
    if (state.isScanning) return;
    
    setState(prev => ({
      ...prev,
      isScanning: true,
      error: null
    }));
    
    abortControllerRef.current = new AbortController();
    
    try {
      const discovered = await discoverSessions();
      
      setState(prev => ({
        ...prev,
        isScanning: false,
        discoveredSessions: discovered,
        lastScan: Date.now(),
        error: null
      }));
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        isScanning: false,
        error: error instanceof Error ? error.message : 'Discovery failed'
      }));
    }
  }, [state.isScanning, discoverSessions]);

  // Start continuous scanning
  const startScanning = useCallback(() => {
    if (scanIntervalRef.current) return;
    
    // Initial scan
    scan();
    
    // Periodic scans every 30 seconds
    scanIntervalRef.current = setInterval(() => {
      scan();
    }, 30000);
    
  }, [scan]);

  // Stop scanning
  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isScanning: false
    }));
  }, []);

  // Auto-start/stop based on enabled state
  useEffect(() => {
    if (enabled) {
      startScanning();
    } else {
      stopScanning();
    }
    
    return () => {
      stopScanning();
    };
  }, [enabled, startScanning, stopScanning]);

  // Connect to a discovered session
  const connectToSession = useCallback(async (session: DiscoveredSession, pin: string): Promise<{
    websocketUrl: string;
    success: boolean;
    error?: string;
  }> => {
    try {
      const websocketUrl = `${session.host.url.replace('http://', 'ws://').replace('https://', 'wss://')}/websocket?session=${session.id}&pin=${pin}`;
      
      // Test the connection briefly
      const testWs = new WebSocket(websocketUrl);
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          testWs.close();
          resolve({
            websocketUrl: '',
            success: false,
            error: 'Connection timeout'
          });
        }, 5000);
        
        testWs.onopen = () => {
          clearTimeout(timeout);
          testWs.close();
          resolve({
            websocketUrl,
            success: true
          });
        };
        
        testWs.onerror = () => {
          clearTimeout(timeout);
          resolve({
            websocketUrl: '',
            success: false,
            error: 'Connection failed'
          });
        };
      });
      
    } catch (error) {
      return {
        websocketUrl: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, []);

  return {
    ...state,
    scan,
    startScanning,
    stopScanning,
    connectToSession
  };
};