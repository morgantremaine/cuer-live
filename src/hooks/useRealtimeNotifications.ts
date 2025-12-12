import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { simpleConnectionHealth } from '@/services/SimpleConnectionHealth';

/**
 * Hook that monitors realtime connection health and displays toast notifications
 * for connection status changes. Uses SimpleConnectionHealth as single source of truth.
 * 
 * Only shows "Connection Restored" after recovering from a genuine failure,
 * not during initial channel setup on navigation.
 */
export const useRealtimeNotifications = (rundownId?: string) => {
  const { toast } = useToast();
  const lastStatusRef = useRef<string>('unknown');
  const toastIdRef = useRef<string | null>(null);
  const hasHadStableConnectionRef = useRef<boolean>(false);

  const updateStatus = useCallback((health: { allConnected: boolean; anyDisconnected: boolean }) => {
    const currentStatus = health.allConnected ? 'healthy' : 
                         health.anyDisconnected ? 'degraded' : 'healthy';

    if (currentStatus !== lastStatusRef.current) {
      // Dismiss previous toast
      if (toastIdRef.current) {
        toast({ id: toastIdRef.current, open: false } as any);
        toastIdRef.current = null;
      }

      if (currentStatus === 'degraded') {
        // Only show degraded warning if we've had a stable connection before
        if (hasHadStableConnectionRef.current) {
          toastIdRef.current = toast({
            title: "⚠️ Connection Issue",
            description: "Some channels are reconnecting...",
            duration: Infinity,
          }).id;
        }
      } else if (currentStatus === 'healthy') {
        if (!hasHadStableConnectionRef.current) {
          // First time reaching healthy - mark as stable, no notification
          hasHadStableConnectionRef.current = true;
        } else if (lastStatusRef.current === 'degraded') {
          // Only show "restored" if recovering from actual degraded state
          toast({
            title: "Connection Restored",
            description: "✓ Real-time updates are working",
            variant: "default",
            duration: 3000,
          });
        }
      }

      lastStatusRef.current = currentStatus;
    }
  }, [toast]);

  useEffect(() => {
    if (!rundownId) return;

    // Reset flags on new rundown (fresh navigation)
    hasHadStableConnectionRef.current = false;
    lastStatusRef.current = 'unknown';

    // Subscribe to simple health updates
    const unsubscribe = simpleConnectionHealth.subscribe(rundownId, updateStatus);

    return () => {
      unsubscribe();
      if (toastIdRef.current) {
        toast({ id: toastIdRef.current, open: false } as any);
      }
    };
  }, [rundownId, updateStatus, toast]);
};
