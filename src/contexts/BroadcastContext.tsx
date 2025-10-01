import React, { createContext, useContext, useRef, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

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
  data: any;
}

interface BroadcastContextType {
  broadcast: (operation: UnifiedOperationPayload) => Promise<void>;
  isConnected: boolean;
  instanceId: string;
}

const BroadcastContext = createContext<BroadcastContextType | undefined>(undefined);

export const useBroadcast = () => {
  const context = useContext(BroadcastContext);
  if (!context) {
    throw new Error('useBroadcast must be used within a BroadcastProvider');
  }
  return context;
};

interface BroadcastProviderProps {
  rundownId: string;
  userId: string;
  children: ReactNode;
}

export const BroadcastProvider = ({ rundownId, userId, children }: BroadcastProviderProps) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const instanceId = useRef(uuidv4());
  const clientId = useRef(uuidv4());
  const isConnectedRef = useRef(false);

  console.log('🔌 BROADCAST PROVIDER CREATED:', {
    instanceId: instanceId.current,
    rundownId,
    userId,
    clientId: clientId.current
  });

  useEffect(() => {
    const channelName = `rundown:${rundownId}`;
    
    console.log('📡 BROADCAST: Creating channel:', channelName);
    
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: userId }
      }
    });

    channel
      .on('broadcast', { event: 'operation' }, (payload) => {
        console.log('📨 BROADCAST RECEIVED:', payload);
      })
      .subscribe((status) => {
        console.log('📡 BROADCAST CHANNEL STATUS:', status);
        if (status === 'SUBSCRIBED') {
          isConnectedRef.current = true;
          console.log('✅ BROADCAST CHANNEL READY');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          isConnectedRef.current = false;
          console.log('❌ BROADCAST CHANNEL ERROR:', status);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('🔌 BROADCAST: Cleaning up channel');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      isConnectedRef.current = false;
    };
  }, [rundownId, userId]);

  const broadcast = async (operation: UnifiedOperationPayload): Promise<void> => {
    console.log('📡 BROADCAST: Attempting to send', {
      type: operation.type,
      hasChannel: !!channelRef.current,
      isConnected: isConnectedRef.current,
      instanceId: instanceId.current
    });

    if (!channelRef.current) {
      console.error('❌ BROADCAST FAILED: No channel available');
      throw new Error('Broadcast channel not available');
    }

    if (!isConnectedRef.current) {
      console.warn('⚠️ BROADCAST: Channel not ready, attempting anyway');
    }

    try {
      const result = await channelRef.current.send({
        type: 'broadcast',
        event: 'operation',
        payload: operation
      });

      if (result === 'ok') {
        console.log('✅ BROADCAST SENT SUCCESSFULLY:', operation.type);
      } else {
        console.error('❌ BROADCAST FAILED:', result);
        throw new Error(`Broadcast failed with status: ${result}`);
      }
    } catch (error) {
      console.error('❌ BROADCAST ERROR:', error);
      throw error;
    }
  };

  const value: BroadcastContextType = {
    broadcast,
    isConnected: isConnectedRef.current,
    instanceId: instanceId.current
  };

  return (
    <BroadcastContext.Provider value={value}>
      {children}
    </BroadcastContext.Provider>
  );
};
