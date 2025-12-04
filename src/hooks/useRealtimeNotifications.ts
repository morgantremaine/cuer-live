import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { unifiedConnectionHealth } from '@/services/UnifiedConnectionHealth';

/**
 * Hook that monitors realtime connection health and displays toast notifications
 * for connection status changes. Uses UnifiedConnectionHealth as single source of truth.
 */
export const useRealtimeNotifications = (rundownId?: string) => {
  const { toast } = useToast();
  const lastStatusRef = useRef<string>('healthy');
  const toastIdRef = useRef<string | null>(null);

  const updateStatus = useCallback((health: { allHealthy: boolean; anyDegraded: boolean }) => {
    const currentStatus = health.allHealthy ? 'healthy' : 
                         health.anyDegraded ? 'degraded' : 'healthy';

    if (currentStatus !== lastStatusRef.current) {
      // Dismiss previous toast
      if (toastIdRef.current) {
        toast({ id: toastIdRef.current, open: false } as any);
        toastIdRef.current = null;
      }

      if (currentStatus === 'degraded') {
        toastIdRef.current = toast({
          title: "⚠️ Connection Issue",
          description: "Some channels are reconnecting...",
          duration: Infinity,
        }).id;
      } else if (currentStatus === 'healthy' && lastStatusRef.current !== 'healthy') {
        toast({
          title: "Connection Restored",
          description: "✓ Real-time updates are working",
          variant: "default",
          duration: 3000,
        });
      }

      lastStatusRef.current = currentStatus;
    }
  }, [toast]);

  useEffect(() => {
    if (!rundownId) return;

    // Subscribe to unified health updates
    const unsubscribe = unifiedConnectionHealth.subscribe(rundownId, updateStatus);

    // Initial check
    const health = unifiedConnectionHealth.getHealth(rundownId);
    updateStatus(health);

    return () => {
      unsubscribe();
      if (toastIdRef.current) {
        toast({ id: toastIdRef.current, open: false } as any);
      }
    };
  }, [rundownId, updateStatus, toast]);
};
