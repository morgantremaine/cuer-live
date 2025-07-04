import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useResponsiveLayout } from './use-mobile';

interface MobileRealtimeOptimizationProps {
  rundownId: string | null;
  onConnectionChange?: (isConnected: boolean) => void;
  enabled?: boolean;
}

export const useMobileRealtimeOptimization = ({
  rundownId,
  onConnectionChange,
  enabled = true
}: MobileRealtimeOptimizationProps) => {
  const { isMobileOrTablet } = useResponsiveLayout();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);
  const connectionCheckRef = useRef<NodeJS.Timeout | null>(null);
  const lastHeartbeatRef = useRef<number>(Date.now());

  // Enhanced connection monitoring for mobile
  const checkConnectionHealth = useCallback(() => {
    if (!isMobileOrTablet || !channelRef.current) return;

    const channel = channelRef.current;
    const now = Date.now();
    const timeSinceLastHeartbeat = now - lastHeartbeatRef.current;

    // If no heartbeat response in 10 seconds on mobile, consider connection stale
    if (timeSinceLastHeartbeat > 10000) {
      console.log('📱 Mobile connection appears stale, reconnecting...');
      
      // Signal disconnection
      if (onConnectionChange) {
        onConnectionChange(false);
      }

      // Force reconnection
      if (channel) {
        supabase.removeChannel(channel);
        channelRef.current = null;
      }
      
      // Attempt reconnection after short delay
      reconnectTimeoutRef.current = setTimeout(() => {
        setupMobileOptimizedConnection();
      }, 1000);
    }
  }, [isMobileOrTablet, onConnectionChange]);

  // Mobile-optimized connection setup
  const setupMobileOptimizedConnection = useCallback(() => {
    if (!rundownId || !enabled || !isMobileOrTablet) return;

    // Clear existing connections
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    console.log('📱 Setting up mobile-optimized realtime connection');

    const channel = supabase
      .channel(`mobile-realtime-${rundownId}-${Date.now()}`, {
        config: {
          presence: {
            key: `mobile-user-${Date.now()}`
          }
        }
      })
      .on('system', { event: 'CONNECTED' }, () => {
        console.log('📱 Mobile realtime connected');
        lastHeartbeatRef.current = Date.now();
        if (onConnectionChange) {
          onConnectionChange(true);
        }
      })
      .on('system', { event: 'DISCONNECTED' }, () => {
        console.log('📱 Mobile realtime disconnected');
        if (onConnectionChange) {
          onConnectionChange(false);
        }
      })
      .subscribe((status) => {
        console.log('📱 Mobile subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          lastHeartbeatRef.current = Date.now();
          if (onConnectionChange) {
            onConnectionChange(true);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log('📱 Mobile connection error, attempting reconnect...');
          if (onConnectionChange) {
            onConnectionChange(false);
          }
          
          // Retry connection after 2 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            setupMobileOptimizedConnection();
          }, 2000);
        }
      });

    channelRef.current = channel;
  }, [rundownId, enabled, isMobileOrTablet, onConnectionChange]);

  // Mobile-specific heartbeat system
  const startMobileHeartbeat = useCallback(() => {
    if (!isMobileOrTablet) return;

    // Clear existing heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    // Send heartbeat every 15 seconds on mobile to keep connection alive
    heartbeatIntervalRef.current = setInterval(() => {
      if (channelRef.current) {
        // Send a lightweight ping
        channelRef.current.send({
          type: 'broadcast',
          event: 'heartbeat',
          payload: { timestamp: Date.now() }
        });
        
        lastHeartbeatRef.current = Date.now();
      }
    }, 15000);
  }, [isMobileOrTablet]);

  // Connection health monitoring
  useEffect(() => {
    if (!isMobileOrTablet) return;

    // Check connection health every 5 seconds on mobile
    connectionCheckRef.current = setInterval(checkConnectionHealth, 5000);

    return () => {
      if (connectionCheckRef.current) {
        clearInterval(connectionCheckRef.current);
      }
    };
  }, [isMobileOrTablet, checkConnectionHealth]);

  // Handle visibility changes (mobile apps going to background)
  useEffect(() => {
    if (!isMobileOrTablet) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('📱 App went to background');
        // Keep connection alive but reduce activity
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
      } else {
        console.log('📱 App returned to foreground');
        // Reestablish full connection activity
        startMobileHeartbeat();
        
        // Force connection check when returning from background
        setTimeout(() => {
          checkConnectionHealth();
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isMobileOrTablet, startMobileHeartbeat, checkConnectionHealth]);

  // Initialize mobile optimization
  useEffect(() => {
    if (isMobileOrTablet && rundownId && enabled) {
      setupMobileOptimizedConnection();
      startMobileHeartbeat();
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (connectionCheckRef.current) {
        clearInterval(connectionCheckRef.current);
      }
    };
  }, [rundownId, enabled, isMobileOrTablet, setupMobileOptimizedConnection, startMobileHeartbeat]);

  return {
    isMobileOptimized: isMobileOrTablet
  };
};
