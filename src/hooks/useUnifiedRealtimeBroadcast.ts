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
  userId: string | undefined; // Allow undefined during initialization
  onOperationReceived?: (operation: UnifiedOperationPayload) => void;
}

export const useUnifiedRealtimeBroadcast = ({
  rundownId,
  clientId,
  userId,
  onOperationReceived
}: UseUnifiedRealtimeBroadcastOptions) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onOperationReceivedRef = useRef(onOperationReceived);
  const isConnectedRef = useRef(false);
  const instanceIdRef = useRef(crypto.randomUUID());

  // Removed excessive initialization logging

  // Keep callback ref updated
  useEffect(() => {
    onOperationReceivedRef.current = onOperationReceived;
  }, [onOperationReceived]);

  // Set up unified broadcast channel - dynamically handles userId availability
  useEffect(() => {
    // Only require rundownId - userId can be undefined initially
    if (!rundownId) {
      console.log('🔌 UNIFIED BROADCAST: No rundownId, skipping setup');
      return;
    }

    // If userId is not available yet, wait for it
    if (!userId) {
      console.log('🔌 UNIFIED BROADCAST: Waiting for userId', { 
        instanceId: instanceIdRef.current,
        rundownId, 
        clientId 
      });
      // Clean up any existing channel
      if (channelRef.current) {
        console.log('🔌 UNIFIED BROADCAST: Cleaning up channel while waiting for userId', {
          instanceId: instanceIdRef.current
        });
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isConnectedRef.current = false;
      }
      return;
    }

    console.log('🔌 UNIFIED BROADCAST: Setting up channel', { 
      instanceId: instanceIdRef.current,
      rundownId, 
      clientId, 
      userId 
    });

    // Clean up existing channel before creating new one
    if (channelRef.current) {
      console.log('🔌 UNIFIED BROADCAST: Cleaning up existing channel before recreating', {
        instanceId: instanceIdRef.current
      });
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isConnectedRef.current = false;
    }

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
        console.log('📡 UNIFIED BROADCAST STATUS:', status, { 
          instanceId: instanceIdRef.current,
          rundownId, 
          userId,
          channelName: `rundown-unified-${rundownId}`
        });
        
        // Track connection state
        if (status === 'SUBSCRIBED') {
          isConnectedRef.current = true;
          console.log('✅ UNIFIED BROADCAST: Channel connected and ready', {
            instanceId: instanceIdRef.current,
            rundownId
          });
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          isConnectedRef.current = false;
          console.warn('⚠️ UNIFIED BROADCAST: Channel disconnected', {
            instanceId: instanceIdRef.current,
            status
          });
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('🔌 UNIFIED BROADCAST: Cleaning up channel', {
        instanceId: instanceIdRef.current,
        rundownId
      });
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isConnectedRef.current = false;
      }
    };
  }, [rundownId, clientId, userId]);

  // Broadcast an operation to all clients
  const broadcastOperation = useCallback(async (operation: UnifiedOperationPayload) => {
    console.log('📤 UNIFIED BROADCAST: Broadcasting operation attempt', {
      instanceId: instanceIdRef.current,
      type: operation.type,
      rundownId: operation.rundownId,
      clientId: operation.clientId,
      sequenceNumber: operation.sequenceNumber,
      hasChannel: !!channelRef.current,
      isConnected: isConnectedRef.current
    });

    if (!channelRef.current) {
      console.error('❌ UNIFIED BROADCAST: Channel not ready - cannot broadcast', {
        instanceId: instanceIdRef.current,
        operationType: operation.type
      });
      return;
    }

    if (!isConnectedRef.current) {
      console.warn('⚠️ UNIFIED BROADCAST: Channel not connected yet, attempting anyway', {
        instanceId: instanceIdRef.current,
        operationType: operation.type
      });
    }

    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'operation',
        payload: { operation }
      });

      console.log('✅ UNIFIED BROADCAST: Operation sent successfully', {
        instanceId: instanceIdRef.current,
        type: operation.type
      });
    } catch (error) {
      console.error('❌ UNIFIED BROADCAST ERROR:', {
        instanceId: instanceIdRef.current,
        error,
        operationType: operation.type,
        hasChannel: !!channelRef.current,
        isConnected: isConnectedRef.current
      });
    }
  }, []);

  return {
    broadcastOperation,
    isConnected: isConnectedRef.current,
    instanceId: instanceIdRef.current
  };
};

