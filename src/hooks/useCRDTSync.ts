import { useState, useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { useAuth } from '@/hooks/useAuth';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/types/columns';

export interface CRDTTransportState {
  mode: 'cloud' | 'local' | 'offline';
  isConnected: boolean;
  localHostUrl?: string;
  sessionPin?: string;
}

export interface CRDTSyncProps {
  rundownId: string | null;
  onItemsUpdate: (items: RundownItem[]) => void;
  onColumnsUpdate: (columns: any) => void;
  onTitleUpdate: (title: string) => void;
  onShowcallerStateUpdate: (state: any) => void;
  enabled?: boolean;
}

export const useCRDTSync = ({
  rundownId,
  onItemsUpdate,
  onColumnsUpdate,
  onTitleUpdate,
  onShowcallerStateUpdate,
  enabled = true
}: CRDTSyncProps) => {
  const { user } = useAuth();
  const { isConnected: isNetworkConnected } = useNetworkStatus();
  
  // CRDT state
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [transport, setTransport] = useState<CRDTTransportState>({
    mode: 'offline',
    isConnected: false
  });
  
  const websocketProviderRef = useRef<WebsocketProvider | null>(null);
  const indexedDBProviderRef = useRef<IndexeddbPersistence | null>(null);
  const isInitializingRef = useRef(false);
  const lastSyncRef = useRef<number>(0);

  // Create Yjs document for rundown
  useEffect(() => {
    if (!rundownId || !enabled || isInitializingRef.current) return;
    
    isInitializingRef.current = true;
    console.log('🔄 Creating CRDT document for rundown:', rundownId);
    
    const doc = new Y.Doc();
    
    // Create shared data structures
    const itemsArray = doc.getArray('items');
    const columnsMap = doc.getMap('columns');
    const metaMap = doc.getMap('meta');
    const showcallerMap = doc.getMap('showcaller');
    
    // Set up observers for data changes
    itemsArray.observe(() => {
      const items = itemsArray.toArray() as RundownItem[];
      console.log('📝 CRDT items updated:', items.length, 'items');
      onItemsUpdate(items);
      lastSyncRef.current = Date.now();
    });
    
    columnsMap.observe(() => {
      const columns = columnsMap.toJSON();
      console.log('📝 CRDT columns updated');
      onColumnsUpdate(columns);
      lastSyncRef.current = Date.now();
    });
    
    metaMap.observe(() => {
      const meta = metaMap.toJSON();
      if (meta.title) {
        console.log('📝 CRDT title updated:', meta.title);
        onTitleUpdate(meta.title);
        lastSyncRef.current = Date.now();
      }
    });
    
    showcallerMap.observe(() => {
      const showcallerState = showcallerMap.toJSON();
      console.log('📝 CRDT showcaller state updated');
      onShowcallerStateUpdate(showcallerState);
      lastSyncRef.current = Date.now();
    });
    
    setYdoc(doc);
    isInitializingRef.current = false;
    
    return () => {
      console.log('🔄 Cleaning up CRDT document');
      doc.destroy();
    };
  }, [rundownId, enabled, onItemsUpdate, onColumnsUpdate, onTitleUpdate, onShowcallerStateUpdate]);

  // Set up IndexedDB persistence
  useEffect(() => {
    if (!ydoc || !rundownId) return;
    
    console.log('💾 Setting up IndexedDB persistence for rundown:', rundownId);
    const indexedDBProvider = new IndexeddbPersistence(`rundown-${rundownId}`, ydoc);
    
    indexedDBProvider.on('synced', () => {
      console.log('💾 IndexedDB sync complete for rundown:', rundownId);
    });
    
    indexedDBProviderRef.current = indexedDBProvider;
    
    return () => {
      indexedDBProvider.destroy();
    };
  }, [ydoc, rundownId]);

  // Discover local host via mDNS simulation (for now, check localStorage)
  const discoverLocalHost = useCallback(async (): Promise<string | null> => {
    // For now, check if user has configured a local host
    const localHost = localStorage.getItem('cuer-local-host');
    if (localHost) {
      try {
        // Test if local host is available
        const response = await fetch(`${localHost}/health`, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(2000)
        });
        return localHost;
      } catch {
        console.log('🔍 Local host not available:', localHost);
        return null;
      }
    }
    return null;
  }, []);

  // Smart transport switching logic
  const establishConnection = useCallback(async () => {
    if (!ydoc || !rundownId || !user) return;
    
    console.log('🔌 Establishing CRDT connection...');
    
    // Clean up existing connections
    if (websocketProviderRef.current) {
      websocketProviderRef.current.destroy();
      websocketProviderRef.current = null;
    }
    
    let wsProvider: WebsocketProvider | null = null;
    
    // Try cloud first if network is connected
    if (isNetworkConnected) {
      try {
        // For now, use a mock WebSocket URL - this would connect to Supabase Realtime
        const cloudWsUrl = `wss://khdiwrkgahsbjszlwnob.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoZGl3cmtnYWhzYmpzemx3bm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MzcwNTYsImV4cCI6MjA2NDIxMzA1Nn0.__Z_HYaLyyvYa5yNHwjsln3ti6sQoflRoEYCq6Agedk`;
        
        wsProvider = new WebsocketProvider(
          cloudWsUrl,
          `rundown-${rundownId}`,
          ydoc,
          {
            params: {
              auth: user.id
            }
          }
        );
        
        // Set up connection handlers
        wsProvider.on('status', ({ status }) => {
          console.log('☁️ Cloud WebSocket status:', status);
          
          if (status === 'connected') {
            setTransport({
              mode: 'cloud',
              isConnected: true
            });
          } else if (status === 'disconnected') {
            setTransport(prev => ({
              ...prev,
              isConnected: false
            }));
          }
        });
        
        websocketProviderRef.current = wsProvider;
        return;
        
      } catch (error) {
        console.log('☁️ Cloud connection failed, trying local host...');
      }
    }
    
    // Try local host discovery
    const localHostUrl = await discoverLocalHost();
    if (localHostUrl) {
      try {
        wsProvider = new WebsocketProvider(
          localHostUrl,
          `rundown-${rundownId}`,
          ydoc,
          {
            params: {
              auth: user.id
            }
          }
        );
        
        wsProvider.on('status', ({ status }) => {
          console.log('🏠 Local WebSocket status:', status);
          
          if (status === 'connected') {
            setTransport({
              mode: 'local',
              isConnected: true,
              localHostUrl
            });
          } else if (status === 'disconnected') {
            setTransport(prev => ({
              ...prev,
              isConnected: false
            }));
          }
        });
        
        websocketProviderRef.current = wsProvider;
        return;
        
      } catch (error) {
        console.log('🏠 Local host connection failed');
      }
    }
    
    // Fall back to offline mode
    console.log('📴 Falling back to offline mode');
    setTransport({
      mode: 'offline',
      isConnected: false
    });
    
  }, [ydoc, rundownId, user, isNetworkConnected, discoverLocalHost]);

  // Establish connection when conditions are met
  useEffect(() => {
    if (ydoc && rundownId && user && enabled) {
      establishConnection();
    }
    
    return () => {
      if (websocketProviderRef.current) {
        websocketProviderRef.current.destroy();
        websocketProviderRef.current = null;
      }
    };
  }, [ydoc, rundownId, user, enabled, isNetworkConnected, establishConnection]);

  // Retry connection when network status changes
  useEffect(() => {
    if (isNetworkConnected && transport.mode === 'offline' && ydoc) {
      console.log('🔄 Network reconnected, retrying connection...');
      establishConnection();
    }
  }, [isNetworkConnected, transport.mode, ydoc, establishConnection]);

  // Update functions
  const updateItems = useCallback((items: RundownItem[]) => {
    if (!ydoc) return;
    
    const itemsArray = ydoc.getArray('items');
    
    // Use Yjs transaction for atomic updates
    ydoc.transact(() => {
      // Clear and replace array contents
      itemsArray.delete(0, itemsArray.length);
      itemsArray.push(items);
    });
    
    console.log('📤 CRDT items updated via local change:', items.length, 'items');
  }, [ydoc]);

  const updateColumns = useCallback((columns: any) => {
    if (!ydoc) return;
    
    const columnsMap = ydoc.getMap('columns');
    
    ydoc.transact(() => {
      columnsMap.clear();
      Object.entries(columns).forEach(([key, value]) => {
        columnsMap.set(key, value);
      });
    });
    
    console.log('📤 CRDT columns updated via local change');
  }, [ydoc]);

  const updateTitle = useCallback((title: string) => {
    if (!ydoc) return;
    
    const metaMap = ydoc.getMap('meta');
    metaMap.set('title', title);
    
    console.log('📤 CRDT title updated via local change:', title);
  }, [ydoc]);

  const updateShowcallerState = useCallback((state: any) => {
    if (!ydoc) return;
    
    const showcallerMap = ydoc.getMap('showcaller');
    
    ydoc.transact(() => {
      showcallerMap.clear();
      Object.entries(state).forEach(([key, value]) => {
        showcallerMap.set(key, value);
      });
    });
    
    console.log('📤 CRDT showcaller state updated via local change');
  }, [ydoc]);

  // Configure local host manually (for testing)
  const setLocalHost = useCallback((url: string, pin?: string) => {
    localStorage.setItem('cuer-local-host', url);
    if (pin) {
      localStorage.setItem('cuer-local-pin', pin);
    }
    
    // Reconnect with new host
    establishConnection();
  }, [establishConnection]);

  return {
    // State
    isReady: !!ydoc,
    transport,
    lastSync: lastSyncRef.current,
    
    // Actions
    updateItems,
    updateColumns,
    updateTitle,
    updateShowcallerState,
    setLocalHost,
    reconnect: establishConnection
  };
};