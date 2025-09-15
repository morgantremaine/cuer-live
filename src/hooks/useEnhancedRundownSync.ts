import { useEffect, useCallback, useRef } from 'react';
import { useCRDTSync } from './useCRDTSync';
import { useTransportManager } from './useTransportManager';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/types/columns';

interface EnhancedRundownSyncProps {
  rundownId: string | null;
  
  // Current state from existing system
  items: RundownItem[];
  columns: any;
  title: string;
  showcallerState: any;
  
  // Update callbacks to existing system
  onItemsUpdate: (items: RundownItem[]) => void;
  onColumnsUpdate: (columns: any) => void;
  onTitleUpdate: (title: string) => void;
  onShowcallerStateUpdate: (state: any) => void;
  
  // Local change indicators from existing system
  onLocalItemsChange?: (items: RundownItem[]) => void;
  onLocalColumnsChange?: (columns: any) => void;
  onLocalTitleChange?: (title: string) => void;
  onLocalShowcallerChange?: (state: any) => void;
  
  enabled?: boolean;
}

/**
 * Enhanced sync that bridges CRDT with existing Supabase real-time system
 * Acts as a transport layer that can switch between cloud/local/offline modes
 */
export const useEnhancedRundownSync = ({
  rundownId,
  items,
  columns,
  title,
  showcallerState,
  onItemsUpdate,
  onColumnsUpdate,
  onTitleUpdate,
  onShowcallerStateUpdate,
  onLocalItemsChange,
  onLocalColumnsChange,
  onLocalTitleChange,
  onLocalShowcallerChange,
  enabled = true
}: EnhancedRundownSyncProps) => {
  
  const { transport } = useTransportManager();
  const isLocalModeRef = useRef(false);
  const lastCloudSyncRef = useRef<number>(0);
  
  // Only use CRDT when in local or offline mode
  const shouldUseCRDT = transport.mode === 'local' || transport.mode === 'offline';
  
  const crdt = useCRDTSync({
    rundownId,
    onItemsUpdate: useCallback((crdtItems: RundownItem[]) => {
      if (shouldUseCRDT) {
        console.log('📥 CRDT → App: items update');
        onItemsUpdate(crdtItems);
      }
    }, [shouldUseCRDT, onItemsUpdate]),
    
    onColumnsUpdate: useCallback((crdtColumns: any) => {
      if (shouldUseCRDT) {
        console.log('📥 CRDT → App: columns update');
        onColumnsUpdate(crdtColumns);
      }
    }, [shouldUseCRDT, onColumnsUpdate]),
    
    onTitleUpdate: useCallback((crdtTitle: string) => {
      if (shouldUseCRDT) {
        console.log('📥 CRDT → App: title update');
        onTitleUpdate(crdtTitle);
      }
    }, [shouldUseCRDT, onTitleUpdate]),
    
    onShowcallerStateUpdate: useCallback((crdtState: any) => {
      if (shouldUseCRDT) {
        console.log('📥 CRDT → App: showcaller update');
        onShowcallerStateUpdate(crdtState);
      }
    }, [shouldUseCRDT, onShowcallerStateUpdate]),
    
    enabled: enabled && shouldUseCRDT
  });

  // Sync local changes to CRDT when in local/offline mode
  useEffect(() => {
    if (shouldUseCRDT && crdt.isReady && items) {
      console.log('📤 App → CRDT: items sync');
      crdt.updateItems(items);
    }
  }, [shouldUseCRDT, crdt.isReady, items, crdt]);

  useEffect(() => {
    if (shouldUseCRDT && crdt.isReady && columns) {
      console.log('📤 App → CRDT: columns sync');
      crdt.updateColumns(columns);
    }
  }, [shouldUseCRDT, crdt.isReady, columns, crdt]);

  useEffect(() => {
    if (shouldUseCRDT && crdt.isReady && title) {
      console.log('📤 App → CRDT: title sync');
      crdt.updateTitle(title);
    }
  }, [shouldUseCRDT, crdt.isReady, title, crdt]);

  useEffect(() => {
    if (shouldUseCRDT && crdt.isReady && showcallerState) {
      console.log('📤 App → CRDT: showcaller sync');
      crdt.updateShowcallerState(showcallerState);
    }
  }, [shouldUseCRDT, crdt.isReady, showcallerState, crdt]);

  // Handle transport mode transitions
  useEffect(() => {
    const wasLocalMode = isLocalModeRef.current;
    const isNowLocalMode = shouldUseCRDT;
    
    if (wasLocalMode !== isNowLocalMode) {
      console.log(`🔄 Transport transition: ${wasLocalMode ? 'local' : 'cloud'} → ${isNowLocalMode ? 'local' : 'cloud'}`);
      
      if (isNowLocalMode) {
        // Switching TO local/offline mode
        console.log('📱 Switching to local-first mode');
        
        // Initialize CRDT with current state
        if (crdt.isReady) {
          crdt.updateItems(items);
          crdt.updateColumns(columns);
          crdt.updateTitle(title);
          crdt.updateShowcallerState(showcallerState);
        }
        
      } else {
        // Switching TO cloud mode (internet restored)
        console.log('☁️ Switching to cloud mode - syncing offline changes');
        
        // TODO: Implement cloud sync of offline changes
        // This would:
        // 1. Get final CRDT state
        // 2. Create a unified diff/patch
        // 3. Apply to Supabase via existing save system
        // 4. Handle conflicts if any
        
        lastCloudSyncRef.current = Date.now();
      }
      
      isLocalModeRef.current = isNowLocalMode;
    }
  }, [shouldUseCRDT, crdt, items, columns, title, showcallerState]);

  // Provide enhanced local change handlers for the app to use
  const enhancedLocalHandlers = {
    onItemsChange: useCallback((newItems: RundownItem[]) => {
      // Always call the original handler for immediate UI updates
      onLocalItemsChange?.(newItems);
      
      // Additionally sync to CRDT if in local mode
      if (shouldUseCRDT && crdt.isReady) {
        console.log('📤 Local change → CRDT: items');
        crdt.updateItems(newItems);
      }
    }, [shouldUseCRDT, crdt, onLocalItemsChange]),
    
    onColumnsChange: useCallback((newColumns: any) => {
      onLocalColumnsChange?.(newColumns);
      
      if (shouldUseCRDT && crdt.isReady) {
        console.log('📤 Local change → CRDT: columns');
        crdt.updateColumns(newColumns);
      }
    }, [shouldUseCRDT, crdt, onLocalColumnsChange]),
    
    onTitleChange: useCallback((newTitle: string) => {
      onLocalTitleChange?.(newTitle);
      
      if (shouldUseCRDT && crdt.isReady) {
        console.log('📤 Local change → CRDT: title');
        crdt.updateTitle(newTitle);
      }
    }, [shouldUseCRDT, crdt, onLocalTitleChange]),
    
    onShowcallerChange: useCallback((newState: any) => {
      onLocalShowcallerChange?.(newState);
      
      if (shouldUseCRDT && crdt.isReady) {
        console.log('📤 Local change → CRDT: showcaller');
        crdt.updateShowcallerState(newState);
      }
    }, [shouldUseCRDT, crdt, onLocalShowcallerChange])
  };

  return {
    // Transport state
    transport,
    isUsingCRDT: shouldUseCRDT,
    isCRDTReady: crdt.isReady,
    lastCRDTSync: crdt.lastSync,
    lastCloudSync: lastCloudSyncRef.current,
    
    // Enhanced handlers for the app to use instead of direct handlers
    enhancedHandlers: enhancedLocalHandlers,
    
    // CRDT management
    crdt: {
      reconnect: crdt.reconnect,
      setLocalHost: crdt.setLocalHost
    }
  };
};