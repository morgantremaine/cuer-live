import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useConnectionState } from '@/hooks/useConnectionState';

/**
 * Hook that monitors realtime connection health and displays toast notifications
 * for connection status changes
 */
export const useRealtimeNotifications = () => {
  const { toast } = useToast();
  const lastStatusRef = useRef<string>('connected');
  const toastIdRef = useRef<string | null>(null);
  const connectionState = useConnectionState();

  useEffect(() => {
    const checkInterval = setInterval(() => {
      const currentStatus = connectionState.status;

      // Only show notifications when status changes
      if (currentStatus !== lastStatusRef.current) {
        // Dismiss previous toast if exists
        if (toastIdRef.current) {
          toast({ id: toastIdRef.current, open: false } as any);
          toastIdRef.current = null;
        }

        if (currentStatus === 'syncing') {
          // Syncing state
          toastIdRef.current = toast({
            title: "Syncing Rundown...",
            description: "Refreshing to latest version",
            duration: Infinity, // Keep showing until resolved
          }).id;
        } else if (currentStatus === 'disconnected') {
          // Disconnected
          toast({
            title: "Connection Lost",
            description: "Please reload the page",
            variant: "destructive",
            duration: Infinity,
          });
        } else if (currentStatus === 'connected' && lastStatusRef.current !== 'connected') {
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
  }, [toast, connectionState.status]);
};
