/**
 * Real-time Operational Transform Hook
 * 
 * Handles real-time synchronization of OT operations via Supabase
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Operation } from '@/lib/operationalTransform/types';
import { useCollaborativeStore, useCollaborativeActions } from '@/stores/collaborativeState';

interface UseRealtimeOTProps {
  rundownId: string;
  enabled: boolean;
}

export const useRealtimeOT = ({ rundownId, enabled }: UseRealtimeOTProps) => {
  const { user } = useAuth();
  const channelRef = useRef<any>(null);
  const { otEngine } = useCollaborativeStore();
  const actions = useCollaborativeActions();
  
  // Handle incoming operations from other users
  const handleRemoteOperation = useCallback(async (payload: any) => {
    if (!otEngine || !user || payload.user_id === user.id) {
      return; // Ignore our own operations
    }

    console.log('📨 Received remote operation:', payload);
    
    try {
      const operation = payload.operation_data as Operation;
      
      // Submit the remote operation to our OT engine
      const result = await otEngine.submitOperation(payload.user_id, operation);
      
      if (!result.success) {
        console.error('Failed to apply remote operation:', operation);
      }
    } catch (error) {
      console.error('Error handling remote operation:', error);
    }
  }, [otEngine, user]);

  // Handle user presence updates
  const handlePresenceUpdate = useCallback((payload: any) => {
    if (!user || payload.user_id === user.id) {
      return; // Ignore our own presence
    }

    console.log('👤 User presence update:', payload);
    
    if (payload.event_type === 'editing_start') {
      // Another user started editing a field
      const { target_id, field } = payload.metadata;
      console.log(`User ${payload.user_id} started editing ${target_id}.${field}`);
    } else if (payload.event_type === 'editing_end') {
      // Another user stopped editing a field
      const { target_id, field } = payload.metadata;
      console.log(`User ${payload.user_id} stopped editing ${target_id}.${field}`);
    }
  }, [user]);

  // Broadcast operation to other users
  const broadcastOperation = useCallback(async (operation: Operation) => {
    if (!channelRef.current || !user) return;

    try {
      const { error } = await supabase
        .from('rundown_operations')
        .insert({
          rundown_id: rundownId,
          user_id: user.id,
          operation_type: operation.type,
          operation_data: operation,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to broadcast operation:', error);
      } else {
        console.log('📤 Broadcasted operation:', operation.type);
      }
    } catch (error) {
      console.error('Error broadcasting operation:', error);
    }
  }, [rundownId, user]);

  // Broadcast presence updates
  const broadcastPresence = useCallback(async (eventType: string, metadata: any) => {
    if (!channelRef.current || !user) return;

    try {
      const { error } = await supabase
        .from('rundown_presence')
        .insert({
          rundown_id: rundownId,
          user_id: user.id,
          event_type: eventType,
          metadata,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to broadcast presence:', error);
      }
    } catch (error) {
      console.error('Error broadcasting presence:', error);
    }
  }, [rundownId, user]);

  // Set up real-time subscription
  useEffect(() => {
    if (!enabled || !rundownId || !user) {
      return;
    }

    console.log('🔄 Setting up real-time OT subscription for rundown:', rundownId);

    // Create channel for this rundown
    const channel = supabase.channel(`rundown_ot_${rundownId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rundown_operations',
          filter: `rundown_id=eq.${rundownId}`
        },
        handleRemoteOperation
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rundown_presence',
          filter: `rundown_id=eq.${rundownId}`
        },
        handlePresenceUpdate
      )
      .subscribe((status) => {
        console.log('📡 Real-time OT subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('🔌 Cleaning up real-time OT subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, rundownId, user, handleRemoteOperation, handlePresenceUpdate]);

  return {
    broadcastOperation,
    broadcastPresence,
    isConnected: !!channelRef.current
  };
};