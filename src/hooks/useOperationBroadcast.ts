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
    console.log('📡 RAW BROADCAST MESSAGE:', {
      ...message,
      timestamp: new Date().toISOString(),
      clientId,
      rundownId
    });
    
    // Supabase wraps the actual payload in message.payload
    // message = {type: 'broadcast', event: 'operation', payload: {type: 'operation_applied', operation, rundownId}}
    const payload = message.payload;
    
    console.log('🔍 BROADCAST DEBUG:', {
      hasPayload: !!message.payload,
      messageType: message.type,
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

    // Handle batch operations (new format)
    if (payload?.type === 'batch_operations_applied' && payload?.rundownId === rundownId) {
      const operations = payload.operations as RemoteOperation[];
      
      console.log('✅ BATCH BROADCAST RECEIVED:', {
        batchSize: operations.length,
        types: operations.map(op => op.operationType)
      });
      
      // Process each operation in the batch
      for (const operation of operations) {
        // Ignore operations from our own client
        if (operation.clientId === clientId) {
          console.log('🔄 IGNORING OWN OPERATION:', operation.id);
          continue;
        }

        console.log('🎯 APPLYING REMOTE OPERATION FROM BATCH:', {
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
    } 
    // Handle single operations (backwards compatibility)
    else if (payload?.type === 'operation_applied' && payload?.rundownId === rundownId) {
      const operation = payload.operation as RemoteOperation;
      
      console.log('✅ SINGLE OPERATION BROADCAST RECEIVED');
      
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
    } else {
      console.log('❌ BROADCAST FAILED CHECKS - NOT PROCESSING', {
        hasType: !!payload?.type,
        hasRundownId: !!payload?.rundownId,
        payloadType: payload?.type
      });
    }
  }, [rundownId, clientId]); // Removed callback dependencies

  // Set up realtime subscription
  useEffect(() => {
    if (!rundownId) return;

    const channelName = `rundown-operations-${rundownId}`;
    console.log('🔌 SETTING UP OPERATION BROADCAST SUBSCRIPTION:', {
      channelName,
      clientId,
      rundownId,
      timestamp: new Date().toISOString()
    });

    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'operation' }, handleOperationBroadcast)
      .on('broadcast', { event: 'ping' }, (message) => {
        console.log('🏓 RECEIVED PING:', {
          from: message.payload?.from,
          clientId,
          isOwnPing: message.payload?.from === clientId,
          timestamp: message.payload?.timestamp
        });
        
        // Reply with pong if not our own ping
        if (message.payload?.from !== clientId) {
          console.log('🏓 SENDING PONG in response to ping from:', message.payload?.from);
          channel.send({
            type: 'broadcast',
            event: 'pong',
            payload: {
              type: 'pong',
              from: clientId,
              replyingTo: message.payload?.from,
              timestamp: new Date().toISOString()
            }
          }).catch(err => console.error('❌ FAILED TO SEND PONG:', err));
        }
      })
      .on('broadcast', { event: 'pong' }, (message) => {
        console.log('🏓 RECEIVED PONG:', {
          from: message.payload?.from,
          replyingTo: message.payload?.replyingTo,
          isForMe: message.payload?.replyingTo === clientId,
          timestamp: message.payload?.timestamp
        });
      })
      .subscribe((status, err) => {
        console.log('📡 OPERATION BROADCAST STATUS:', {
          status,
          error: err,
          channelName,
          clientId,
          timestamp: new Date().toISOString()
        });
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ BROADCAST CHANNEL CONNECTED:', {
            channelName,
            clientId,
            canReceive: true
          });
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ BROADCAST CHANNEL ERROR:', {
            channelName,
            error: err
          });
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ BROADCAST CHANNEL TIMEOUT:', {
            channelName
          });
        }
      });

    // Send a test ping to verify channel is working
    setTimeout(() => {
      channel.send({
        type: 'broadcast',
        event: 'ping',
        payload: {
          type: 'ping',
          from: clientId,
          timestamp: new Date().toISOString()
        }
      }).then(() => {
        console.log('🏓 SENT PING on channel:', channelName);
      }).catch((err) => {
        console.error('❌ FAILED TO SEND PING:', err);
      });
    }, 2000);

    return () => {
      console.log('🔌 CLEANING UP OPERATION BROADCAST SUBSCRIPTION:', {
        channelName,
        clientId
      });
      supabase.removeChannel(channel);
    };
  }, [rundownId, handleOperationBroadcast, clientId]);

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