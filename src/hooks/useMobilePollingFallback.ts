import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useResponsiveLayout } from './use-mobile';

interface MobilePollingFallbackProps {
  rundownId: string | null;
  onDataReceived?: (data: any) => void;
  enabled?: boolean;
  isRealtimeConnected?: boolean;
}

export const useMobilePollingFallback = ({
  rundownId,
  onDataReceived,
  enabled = true,
  isRealtimeConnected = true
}: MobilePollingFallbackProps) => {
  const { isMobileOrTablet } = useResponsiveLayout();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastKnownTimestampRef = useRef<string | null>(null);
  const onDataReceivedRef = useRef(onDataReceived);

  // Keep callback ref updated
  onDataReceivedRef.current = onDataReceived;

  // Mobile polling fallback when realtime is unstable
  const startPollingFallback = useCallback(async () => {
    if (!rundownId || isRealtimeConnected || !isMobileOrTablet) return;

    console.log('📱 Starting mobile polling fallback');

    const poll = async () => {
      try {
        const { data, error } = await supabase
          .from('rundowns')
          .select('*')
          .eq('id', rundownId)
          .single();

        if (error) {
          console.error('📱 Mobile polling error:', error);
          return;
        }

        if (data) {
          const currentTimestamp = data.updated_at;
          
          // Only trigger update if timestamp changed
          if (currentTimestamp !== lastKnownTimestampRef.current) {
            console.log('📱 Mobile polling detected change');
            lastKnownTimestampRef.current = currentTimestamp;
            
            if (onDataReceivedRef.current) {
              onDataReceivedRef.current(data);
            }
          }
        }
      } catch (error) {
        console.error('📱 Mobile polling failed:', error);
      }
    };

    // Poll every 5 seconds when realtime is disconnected on mobile
    pollingIntervalRef.current = setInterval(poll, 5000);
    
    // Initial poll
    poll();
  }, [rundownId, isRealtimeConnected, isMobileOrTablet]);

  const stopPollingFallback = useCallback(() => {
    if (pollingIntervalRef.current) {
      console.log('📱 Stopping mobile polling fallback');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Start/stop polling based on connection status
  useEffect(() => {
    if (!enabled || !isMobileOrTablet) return;

    if (!isRealtimeConnected) {
      startPollingFallback();
    } else {
      stopPollingFallback();
    }

    return () => {
      stopPollingFallback();
    };
  }, [enabled, isRealtimeConnected, isMobileOrTablet, startPollingFallback, stopPollingFallback]);

  return {
    isPollingActive: !isRealtimeConnected && isMobileOrTablet && !!pollingIntervalRef.current
  };
};
