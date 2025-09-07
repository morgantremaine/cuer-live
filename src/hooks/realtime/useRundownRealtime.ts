import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getTabId } from '@/utils/tabUtils';
import { SYNC_CONFIG, type RealtimeUpdate, type SyncState, type FieldProtection } from '@/utils/realtime/types';

interface UseRundownRealtimeOptions {
  rundownId: string;
  onContentUpdate?: (data: any) => void;
  onShowcallerUpdate?: (data: any) => void;
  onBlueprintUpdate?: (data: any) => void;
  enabled?: boolean;
}

export const useRundownRealtime = ({
  rundownId,
  onContentUpdate,
  onShowcallerUpdate,
  onBlueprintUpdate,
  enabled = true
}: UseRundownRealtimeOptions) => {
  const { user } = useAuth();
  const [syncState, setSyncState] = useState<SyncState>({
    isConnected: false,
    lastSyncTime: null,
    isProcessing: false
  });

  const channelRef = useRef<any>(null);
  const tabId = useRef(getTabId());
  const fieldProtections = useRef<Map<string, FieldProtection>>(new Map());
  const callbackRefs = useRef({ onContentUpdate, onShowcallerUpdate, onBlueprintUpdate });

  // Keep callback refs current
  callbackRefs.current = { onContentUpdate, onShowcallerUpdate, onBlueprintUpdate };

  // Protect field from updates for typing window
  const protectField = useCallback((fieldKey: string) => {
    const protection: FieldProtection = {
      fieldKey,
      protectedUntil: Date.now() + SYNC_CONFIG.TYPING_PROTECTION_WINDOW
    };
    fieldProtections.current.set(fieldKey, protection);
    console.log('🛡️ Field protected:', fieldKey, 'until', new Date(protection.protectedUntil).toISOString());
    
    // Auto-cleanup
    setTimeout(() => {
      fieldProtections.current.delete(fieldKey);
      console.log('🗑️ Field protection expired:', fieldKey);
    }, SYNC_CONFIG.TYPING_PROTECTION_WINDOW);
  }, []);

  // Check if field is currently protected
  const isFieldProtected = useCallback((fieldKey: string): boolean => {
    const protection = fieldProtections.current.get(fieldKey);
    if (!protection) return false;
    
    const isStillProtected = Date.now() < protection.protectedUntil;
    if (!isStillProtected) {
      fieldProtections.current.delete(fieldKey);
    }
    return isStillProtected;
  }, []);

  // Process incoming realtime update
  const processUpdate = useCallback((payload: any) => {
    const { new: newData, old: oldData, table } = payload;
    
    // Skip own updates based on tab_id
    if (newData?.tab_id === tabId.current) {
      console.log('⏭️ Skipping own update (tab match)');
      return;
    }

    // Skip if not for current rundown
    if (newData?.id !== rundownId && newData?.rundown_id !== rundownId) {
      return;
    }

    console.log('📡 Processing realtime update:', {
      table,
      docVersion: newData?.doc_version,
      timestamp: newData?.updated_at,
      tabId: newData?.tab_id
    });

    // Show processing indicator
    setSyncState(prev => ({ ...prev, isProcessing: true, lastSyncTime: newData?.updated_at || prev.lastSyncTime }));
    
    // Hide processing indicator after brief delay
    setTimeout(() => {
      setSyncState(prev => ({ ...prev, isProcessing: false }));
    }, 800);

    // Route to appropriate callback based on table and changes
    if (table === 'blueprints') {
      callbackRefs.current.onBlueprintUpdate?.(newData);
      return;
    }

    // Check for showcaller-only changes
    const hasShowcallerChange = JSON.stringify(newData?.showcaller_state) !== JSON.stringify(oldData?.showcaller_state);
    const hasContentChanges = ['items', 'title', 'start_time', 'timezone', 'external_notes', 'show_date']
      .some(field => JSON.stringify(newData?.[field]) !== JSON.stringify(oldData?.[field]));

    if (hasShowcallerChange && !hasContentChanges) {
      callbackRefs.current.onShowcallerUpdate?.(newData);
    } else if (hasContentChanges) {
      // Apply field-level merging with protection
      const mergedData = { ...newData };
      
      // Check each field for protection
      ['items', 'title', 'start_time', 'timezone', 'external_notes', 'show_date'].forEach(field => {
        if (isFieldProtected(`${rundownId}-${field}`) && JSON.stringify(newData?.[field]) !== JSON.stringify(oldData?.[field])) {
          console.log('🚫 Skipping protected field update:', field);
          // Keep old value for protected field
          delete mergedData[field];
        }
      });
      
      callbackRefs.current.onContentUpdate?.(mergedData);
    }
  }, [rundownId, isFieldProtected]);

  useEffect(() => {
    if (!rundownId || !user || !enabled) {
      return;
    }

    console.log('🔗 Setting up simplified realtime for rundown:', rundownId);

    const channel = supabase
      .channel(`simplified-realtime-${rundownId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rundowns'
        },
        processUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'blueprints'
        },
        (payload) => processUpdate({ ...payload, table: 'blueprints' })
      )
      .subscribe((status) => {
        console.log('📡 Simplified realtime status:', status);
        setSyncState(prev => ({
          ...prev,
          isConnected: status === 'SUBSCRIBED'
        }));
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log('🧹 Cleaning up simplified realtime');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [rundownId, user, enabled, processUpdate]);

  return {
    syncState,
    protectField,
    isFieldProtected
  };
};
