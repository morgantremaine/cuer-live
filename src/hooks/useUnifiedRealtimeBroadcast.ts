import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * UNIFIED REALTIME BROADCAST SYSTEM
 * 
 * Single source of truth for ALL rundown operations:
 * - Cell edits (OT system)
 * - Structural changes (add/delete/move rows)
 * - Metadata updates (title, timezone, start time)
 * - Showcaller state updates
 * 
 * Ensures Google Sheets-style real-time collaboration with consistent broadcasting
 */

export type OperationType = 
  | 'CELL_EDIT' 
  | 'ROW_INSERT' 
  | 'ROW_DELETE' 
  | 'ROW_MOVE' 
  | 'ROW_COPY'
  | 'METADATA_UPDATE'
  | 'SHOWCALLER_UPDATE';

export interface UnifiedOperationPayload {
  type: OperationType;
  rundownId: string;
  clientId: string;
  userId: string;
  timestamp: number;
  sequenceNumber?: number;
  data: any; // Operation-specific data
}

interface UseUnifiedRealtimeBroadcastOptions {
  rundownId: string;
  clientId: string;
  userId: string;
  onOperationReceived?: (operation: UnifiedOperationPayload) => void;
  enabled?: boolean;
}

export const useUnifiedRealtimeBroadcast = ({
  rundownId,
  clientId,
  userId,
  onOperationReceived,
  enabled = true
}: UseUnifiedRealtimeBroadcastOptions) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onOperationReceivedRef = useRef(onOperationReceived);

  // Keep callback ref updated
  useEffect(() => {
    onOperationReceivedRef.current = onOperationReceived;
  }, [onOperationReceived]);

  // Set up unified broadcast channel
  useEffect(() => {
    if (!enabled || !rundownId) {
      console.log('🔌 UNIFIED BROADCAST: Not setting up channel', { enabled, rundownId });
      return;
    }

    console.log('🔌 UNIFIED BROADCAST: Setting up channel', { rundownId, clientId, userId });

    // Single channel for ALL operations
    const channel = supabase.channel(`rundown-unified-${rundownId}`)
      .on('broadcast', { event: 'operation' }, (payload: any) => {
        const operation = payload.operation as UnifiedOperationPayload;
        
        // Ignore our own operations
        if (operation.clientId === clientId) {
          console.log('🔄 UNIFIED BROADCAST: Ignoring own operation', {
            type: operation.type,
            clientId: operation.clientId
          });
          return;
        }

        console.log('📡 UNIFIED BROADCAST: Received operation', {
          type: operation.type,
          fromClient: operation.clientId,
          fromUser: operation.userId,
          timestamp: operation.timestamp,
          sequenceNumber: operation.sequenceNumber
        });

        // Route to appropriate handler
        if (onOperationReceivedRef.current) {
          onOperationReceivedRef.current(operation);
        }
      })
      .subscribe((status) => {
        console.log('📡 UNIFIED BROADCAST STATUS:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('🔌 UNIFIED BROADCAST: Cleaning up channel');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [rundownId, clientId, userId, enabled]);

  // Broadcast an operation to all clients
  const broadcastOperation = useCallback(async (operation: UnifiedOperationPayload) => {
    if (!channelRef.current) {
      console.warn('⚠️ UNIFIED BROADCAST: Channel not ready');
      return;
    }

    console.log('📤 UNIFIED BROADCAST: Broadcasting operation', {
      type: operation.type,
      rundownId: operation.rundownId,
      clientId: operation.clientId,
      sequenceNumber: operation.sequenceNumber
    });

    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'operation',
        payload: { operation }
      });

      console.log('✅ UNIFIED BROADCAST: Operation sent successfully');
    } catch (error) {
      console.error('❌ UNIFIED BROADCAST ERROR:', error);
    }
  }, []);

  return {
    broadcastOperation,
    isConnected: !!channelRef.current
  };
};

