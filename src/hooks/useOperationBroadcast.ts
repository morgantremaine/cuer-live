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
  const handleOperationBroadcast = useCallback((message: any) => {
    console.log('📡 RAW BROADCAST MESSAGE:', message);
    
    // Supabase wraps the payload in a message object
    const payload = message.payload || message;
    
    console.log('🔍 BROADCAST DEBUG:', {
      hasPayload: !!message.payload,
      payloadType: payload?.type,
      expectedType: 'operation_applied',
      payloadRundownId: payload?.rundownId,
      expectedRundownId: rundownId,
      typeMatch: payload?.type === 'operation_applied',
      rundownMatch: payload?.rundownId === rundownId,
      hasOperation: !!payload?.operation,
      operationClientId: payload?.operation?.clientId,
      currentClientId: clientId,
      willIgnore: payload?.operation?.clientId === clientId
    });

    if (payload?.type === 'operation_applied' && payload?.rundownId === rundownId) {
      const operation = payload.operation as RemoteOperation;
      
      console.log('✅ BROADCAST PASSED INITIAL CHECKS');
      
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

      console.log('🔍 CALLBACK STATUS:', {
        hasOnRemoteOperation: !!onRemoteOperationRef.current,
        hasOnOperationApplied: !!onOperationAppliedRef.current
      });

      // Use refs to avoid dependency issues
      if (onRemoteOperationRef.current) {
        console.log('📞 CALLING onRemoteOperation');
        onRemoteOperationRef.current(operation);
      }

      if (onOperationAppliedRef.current) {
        console.log('📞 CALLING onOperationApplied');
        onOperationAppliedRef.current(operation);
      }
    } else {
      console.log('❌ BROADCAST FAILED CHECKS - NOT PROCESSING', {
        hasType: !!payload?.type,
        hasRundownId: !!payload?.rundownId
      });
    }
  }, [rundownId, clientId]); // Removed callback dependencies

  // Set up realtime subscription
  useEffect(() => {
    if (!rundownId) return;

    console.log('🔌 SETTING UP OPERATION BROADCAST SUBSCRIPTION:', rundownId);

    const channel = supabase
      .channel(`rundown-operations-${rundownId}`)
      .on('broadcast', { event: 'operation' }, handleOperationBroadcast)
      .subscribe((status) => {
        console.log('📡 OPERATION BROADCAST STATUS:', status);
      });

    return () => {
      console.log('🔌 CLEANING UP OPERATION BROADCAST SUBSCRIPTION');
      supabase.removeChannel(channel);
    };
  }, [rundownId, handleOperationBroadcast]);

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