import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RundownItem } from '@/types/rundown';
import { logger } from '@/utils/logger';

interface BroadcastPayload {
  type: 'live_typing' | 'live_state';
  rundownId: string;
  items?: RundownItem[];
  title?: string;
  startTime?: string;
  timezone?: string;
  userId?: string;
  timestamp: number;
}

interface UseRundownBroadcastProps {
  rundownId: string;
  onLiveUpdate?: (payload: BroadcastPayload) => void;
  enabled?: boolean;
  isSharedView?: boolean;
}

export const useRundownBroadcast = ({
  rundownId,
  onLiveUpdate,
  enabled = true,
  isSharedView = false
}: UseRundownBroadcastProps) => {
  const channelRef = useRef<any>(null);
  const lastBroadcastRef = useRef<number>(0);
  const broadcastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userIdRef = useRef<string | null>(null);
  const lastReceivedRef = useRef<number>(Date.now());
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const onLiveUpdateRef = useRef(onLiveUpdate);

  // Keep callback ref updated
  useEffect(() => {
    onLiveUpdateRef.current = onLiveUpdate;
  }, [onLiveUpdate]);

  // Get user ID for broadcast filtering
  const getUserId = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (data.user?.id) {
        return data.user.id;
      }
    } catch (error) {
      // Fall through to anonymous handling
    }
    
    // For anonymous users, create a session ID
    let sessionId = sessionStorage.getItem('broadcast_user_id');
    if (!sessionId) {
      sessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('broadcast_user_id', sessionId);
    }
    return sessionId;
  }, []);

  // Create or get channel with reconnection logic
  useEffect(() => {
    if (!rundownId || !enabled) return;

    const channelName = `rundown-live-${rundownId}`;
    logger.debug(`Setting up broadcast channel: ${channelName}`, { isSharedView });

    const setupChannel = () => {
      // Create channel for this rundown
      const channel = supabase.channel(channelName);

      // Initialize user ID
      getUserId().then(id => {
        userIdRef.current = id;
      });

      // Subscribe to broadcast events
      channel.on('broadcast', { event: 'live_update' }, (payload) => {
        lastReceivedRef.current = Date.now(); // Update health check
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts
        
        const data = payload.payload as BroadcastPayload;
        
        // Don't process our own broadcasts (unless we're a shared view)
        if (!isSharedView && data.userId === userIdRef.current) {
          return;
        }

        logger.debug('Received live broadcast:', {
          type: data.type,
          rundownId: data.rundownId,
          timestamp: data.timestamp,
          itemCount: data.items?.length
        });

        if (onLiveUpdateRef.current) {
          onLiveUpdateRef.current(data);
        }
      });

      channel.subscribe((status) => {
        logger.debug(`Broadcast channel status: ${status}`, { channelName });
        if (status === 'SUBSCRIBED') {
          lastReceivedRef.current = Date.now();
          reconnectAttemptsRef.current = 0;
        }
      });

      channelRef.current = channel;
    };

    setupChannel();

    // Health check: detect stale connections and reconnect
    healthCheckIntervalRef.current = setInterval(() => {
      const timeSinceLastReceived = Date.now() - lastReceivedRef.current;
      const fiveMinutes = 5 * 60 * 1000;
      
      if (timeSinceLastReceived > fiveMinutes && reconnectAttemptsRef.current < 3) {
        console.log('⚠️ Broadcast channel appears stale, reconnecting...', {
          timeSinceLastReceived: Math.round(timeSinceLastReceived / 1000),
          attempt: reconnectAttemptsRef.current + 1
        });
        
        reconnectAttemptsRef.current++;
        
        // Clean up old channel
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        
        // Recreate channel with exponential backoff
        const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 10000);
        setTimeout(() => {
          setupChannel();
        }, backoffDelay);
      }
    }, 60000); // Check every minute

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
      if (channelRef.current) {
        logger.debug(`Cleaning up broadcast channel: ${channelName}`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [rundownId, enabled, isSharedView, getUserId]);

  // Broadcast live changes (debounced)
  const broadcastLiveUpdate = useCallback(async (
    type: 'live_typing' | 'live_state',
    data: Partial<BroadcastPayload>
  ) => {
    if (!channelRef.current || isSharedView) return;

    // Debounce broadcasts to avoid spam
    const now = Date.now();
    if (now - lastBroadcastRef.current < 100) { // 100ms debounce
      if (broadcastTimeoutRef.current) {
        clearTimeout(broadcastTimeoutRef.current);
      }
      broadcastTimeoutRef.current = setTimeout(() => {
        broadcastLiveUpdate(type, data);
      }, 100);
      return;
    }

    lastBroadcastRef.current = now;

    const userId = await getUserId();

    const payload: BroadcastPayload = {
      type,
      rundownId,
      timestamp: now,
      userId,
      ...data
    };

    logger.debug('Broadcasting live update:', payload);

    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'live_update',
        payload
      });
    } catch (error) {
      logger.error('Error broadcasting live update:', error);
    }
  }, [rundownId, isSharedView, getUserId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (broadcastTimeoutRef.current) {
        clearTimeout(broadcastTimeoutRef.current);
      }
    };
  }, []);

  return {
    broadcastLiveUpdate,
    isConnected: !!channelRef.current
  };
};