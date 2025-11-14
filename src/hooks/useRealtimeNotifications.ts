import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { realtimeReconnectionCoordinator } from '@/services/RealtimeReconnectionCoordinator';

/**
 * Hook that monitors realtime connection health and displays toast notifications
 * for connection status changes
 */
export const useRealtimeNotifications = () => {
  const { toast } = useToast();
  const lastStatusRef = useRef<string>('healthy');
  const toastIdRef = useRef<string | null>(null);

  useEffect(() => {
    const checkInterval = setInterval(() => {
      const status = realtimeReconnectionCoordinator.getConnectionStatus();
      const currentStatus = status.isHealthy ? 'healthy' : 
                           status.isReconnecting ? 'reconnecting' : 
                           status.consecutiveFailures >= 2 ? 'degraded' : 'healthy';

      // Only show notifications when status changes
      if (currentStatus !== lastStatusRef.current) {
        // Dismiss previous toast if exists
        if (toastIdRef.current) {
          toast({ id: toastIdRef.current, open: false } as any);
          toastIdRef.current = null;
        }

        if (currentStatus === 'degraded') {
          // Connection quality poor
          toast({
            title: "Connection Quality Poor",
            description: "Using slower sync method to keep data updated",
            variant: "default",
            duration: 5000,
          });
        } else if (currentStatus === 'reconnecting') {
          // Reconnecting
          toastIdRef.current = toast({
            title: "Reconnecting to Server...",
            description: "Please wait while we restore the connection",
            duration: Infinity, // Keep showing until resolved
          }).id;
        } else if (currentStatus === 'healthy' && lastStatusRef.current !== 'healthy') {
          // Connection restored
          toast({
            title: "Connection Restored",
            description: "✓ Real-time updates are working",
            variant: "default",
            duration: 3000,
          });
        }

        lastStatusRef.current = currentStatus;
      }
    }, 2000); // Check every 2 seconds

    return () => {
      clearInterval(checkInterval);
      if (toastIdRef.current) {
        toast({ id: toastIdRef.current, open: false } as any);
      }
    };
  }, [toast]);
};
