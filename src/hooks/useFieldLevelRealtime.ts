import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { usePerCellSaveFeatureFlag } from './usePerCellSaveFeatureFlag';
import { logger } from '@/utils/logger';
import { getTabId } from '@/utils/tabUtils';

interface FieldUpdate {
  rundownId: string;
  itemId: string;
  fieldName: string;
  fieldValue: any;
  updatedBy: string;
  updatedAt: string;
  version: number;
  tabId?: string;
}

interface UseFieldLevelRealtimeProps {
  rundownId: string | null;
  onFieldUpdate?: (update: FieldUpdate) => void;
  enabled?: boolean;
}

/**
 * Field-Level Real-time Updates for per-cell save users
 * 
 * Instead of broadcasting entire documents, this system:
 * - Listens to individual field changes
 * - Applies granular updates in real-time
 * - Provides superior conflict resolution
 * - Reduces bandwidth and processing overhead
 */
export const useFieldLevelRealtime = ({
  rundownId,
  onFieldUpdate,
  enabled = true
}: UseFieldLevelRealtimeProps) => {
  const { user } = useAuth();
  const { isPerCellSaveEnabled } = usePerCellSaveFeatureFlag();
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionRef = useRef<any>(null);
  const onFieldUpdateRef = useRef(onFieldUpdate);
  
  // Keep callback ref updated
  onFieldUpdateRef.current = onFieldUpdate;

  // Field-level real-time subscription
  useEffect(() => {
    // Only enable for per-cell save users
    if (!enabled || !rundownId || !user || !isPerCellSaveEnabled) {
      setIsConnected(false);
      return;
    }

    console.log('🌐 Field-Level Realtime: Setting up subscription', { rundownId, userId: user.id });

    // Create field-level subscription channel
    const channel = supabase.channel(`field-updates-${rundownId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: user.id }
      }
    });

    // Listen for field updates
    channel.on('broadcast', { event: 'field-update' }, (payload) => {
      const fieldUpdate = payload.payload as FieldUpdate;
      
      // Skip our own updates (same tab)
      if (fieldUpdate.tabId === getTabId()) {
        console.log('⏭️ Field-Level Realtime: Skipping own update');
        return;
      }

      // Skip updates from same user (different tabs)
      if (fieldUpdate.updatedBy === user.id) {
        console.log('⏭️ Field-Level Realtime: Skipping update from same user');
        return;
      }

      console.log('📡 Field-Level Realtime: Received field update', {
        itemId: fieldUpdate.itemId,
        fieldName: fieldUpdate.fieldName,
        updatedBy: fieldUpdate.updatedBy,
        version: fieldUpdate.version
      });

      // Apply field update through callback
      if (onFieldUpdateRef.current) {
        onFieldUpdateRef.current(fieldUpdate);
      }
    });

    // Subscribe to the channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Field-Level Realtime: Connected successfully');
        setIsConnected(true);
        subscriptionRef.current = channel;
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Field-Level Realtime: Connection failed');
        setIsConnected(false);
      }
    });

    // Cleanup on unmount
    return () => {
      if (subscriptionRef.current) {
        console.log('🔌 Field-Level Realtime: Disconnecting');
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      setIsConnected(false);
    };
  }, [rundownId, user, enabled, isPerCellSaveEnabled]);

  // Broadcast field update to other users
  const broadcastFieldUpdate = useCallback(async (
    itemId: string,
    fieldName: string,
    fieldValue: any,
    version: number
  ) => {
    if (!subscriptionRef.current || !user || !rundownId) {
      return;
    }

    const fieldUpdate: FieldUpdate = {
      rundownId,
      itemId,
      fieldName,
      fieldValue,
      updatedBy: user.id,
      updatedAt: new Date().toISOString(),
      version,
      tabId: getTabId()
    };

    try {
      await subscriptionRef.current.send({
        type: 'broadcast',
        event: 'field-update',
        payload: fieldUpdate
      });

      console.log('📤 Field-Level Realtime: Broadcasted field update', {
        itemId,
        fieldName,
        version
      });
    } catch (error) {
      console.error('❌ Field-Level Realtime: Failed to broadcast update', error);
    }
  }, [user, rundownId]);

  return {
    isConnected,
    broadcastFieldUpdate,
    isEnabled: isPerCellSaveEnabled
  };
};
