import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Operation } from './useOperationQueue';

interface RemoteOperation extends Operation {
  sequenceNumber: number;
  appliedAt: string;
}

interface UseOperationBroadcastOptions {
  rundownId: string;
  clientId: string;
  onRemoteOperation?: (operation: RemoteOperation) => void;
  onOperationApplied?: (operation: RemoteOperation) => void;
}

export const useOperationBroadcast = ({
  rundownId,
  clientId,
  onRemoteOperation,
  onOperationApplied
}: UseOperationBroadcastOptions) => {
  // Use refs to avoid recreating the callback on every render
  const onRemoteOperationRef = useRef(onRemoteOperation);
  const onOperationAppliedRef = useRef(onOperationApplied);
  
  // Update refs when callbacks change
  useEffect(() => {
    onRemoteOperationRef.current = onRemoteOperation;
  }, [onRemoteOperation]);
  
  useEffect(() => {
    onOperationAppliedRef.current = onOperationApplied;
  }, [onOperationApplied]);

  // Handle incoming operation broadcasts - memoized with stable dependencies
  const handleOperationBroadcast = useCallback((payload: any) => {
    console.log('📡 RECEIVED BROADCAST:', payload);

    if (payload.type === 'operation_applied' && payload.rundownId === rundownId) {
      const operation = payload.operation as RemoteOperation;
      
      // Ignore operations from our own client
      if (operation.clientId === clientId) {
        console.log('🔄 IGNORING OWN OPERATION:', operation.id);
        return;
      }

      console.log('🎯 APPLYING REMOTE OPERATION:', {
        id: operation.id,
        type: operation.operationType,
        fromClient: operation.clientId,
        sequence: operation.sequenceNumber
      });

      // Use refs to avoid dependency issues
      if (onRemoteOperationRef.current) {
        onRemoteOperationRef.current(operation);
      }

      if (onOperationAppliedRef.current) {
        onOperationAppliedRef.current(operation);
      }
    }
  }, [rundownId, clientId]); // Removed callback dependencies

  // Set up DUAL subscription: P2P broadcast (fast) + DB realtime (reliable fallback)
  useEffect(() => {
    if (!rundownId) return;

    console.log('🔌 SETTING UP DUAL OPERATION SUBSCRIPTION:', rundownId);

    // PRIMARY: Fast P2P broadcast channel (like cell edits)
    const broadcastChannel = supabase
      .channel(`rundown-operations-${rundownId}`)
      .on('broadcast', { event: 'operation' }, (payload: any) => {
        console.log('📡 RECEIVED P2P BROADCAST:', payload);

        if (payload.type === 'operation_applied' && payload.rundownId === rundownId) {
          const operation = payload.operation as RemoteOperation;
          
          // Ignore operations from our own client
          if (operation.clientId === clientId) {
            console.log('🔄 IGNORING OWN OPERATION (P2P)');
            return;
          }

          console.log('⚡ APPLYING REMOTE OPERATION FROM P2P:', {
            id: operation.id,
            type: operation.operationType,
            fromClient: operation.clientId
          });

          // Use refs to avoid dependency issues
          if (onRemoteOperationRef.current) {
            onRemoteOperationRef.current(operation);
          }

          if (onOperationAppliedRef.current) {
            onOperationAppliedRef.current(operation);
          }
        }
      })
      .subscribe((status) => {
        console.log('📡 P2P BROADCAST STATUS:', status);
      });

    // FALLBACK: Database realtime for reliability
    const dbChannel = supabase
      .channel(`rundown-operations-db-${rundownId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rundown_operations',
          filter: `rundown_id=eq.${rundownId}`
        },
        (payload) => {
          console.log('📡 RECEIVED DATABASE INSERT (FALLBACK):', payload);
          
          const newOperation = payload.new;
          
          // Ignore operations from our own client
          if (newOperation.client_id === clientId) {
            return;
          }

          // Convert DB record to operation format
          const operation: RemoteOperation = {
            id: newOperation.id,
            rundownId: newOperation.rundown_id,
            operationType: newOperation.operation_type,
            operationData: newOperation.operation_data,
            userId: newOperation.user_id,
            clientId: newOperation.client_id,
            timestamp: new Date(newOperation.created_at).getTime(),
            sequenceNumber: newOperation.sequence_number,
            appliedAt: newOperation.applied_at,
            status: 'acknowledged'
          };

          // Use refs to avoid dependency issues
          if (onRemoteOperationRef.current) {
            onRemoteOperationRef.current(operation);
          }

          if (onOperationAppliedRef.current) {
            onOperationAppliedRef.current(operation);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 DATABASE FALLBACK STATUS:', status);
      });

    return () => {
      console.log('🔌 CLEANING UP DUAL SUBSCRIPTIONS');
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(dbChannel);
    };
  }, [rundownId, clientId]);

  // Broadcast an operation
  const broadcastOperation = useCallback(async (operation: RemoteOperation) => {
    if (!rundownId) return;

    console.log('📤 BROADCASTING OPERATION:', operation.id);

    try {
      const channel = supabase.channel(`rundown-operations-${rundownId}`);
      
      await channel.send({
        type: 'broadcast',
        event: 'operation',
        payload: {
          type: 'operation_applied',
          operation,
          rundownId
        }
      });

      console.log('✅ OPERATION BROADCAST SENT:', operation.id);
    } catch (error) {
      console.error('❌ BROADCAST ERROR:', error);
    }
  }, [rundownId]);

  return {
    broadcastOperation
  };
};