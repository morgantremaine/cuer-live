import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Hook to detect wake from sleep and show reconnection status
 */
export const useWakeFromSleepDetection = () => {
  useEffect(() => {
    let lastVisibilityChange = Date.now();
    let reconnectionToastId: string | number | undefined;

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Tab went hidden
        lastVisibilityChange = Date.now();
        return;
      }

      // Tab became visible
      const hiddenDuration = Date.now() - lastVisibilityChange;

      // If hidden for more than 30 seconds, show reconnection status
      if (hiddenDuration > 30000) {
        console.log('🌅 Wake from sleep detected - showing reconnection status');

        // Show reconnecting toast
        reconnectionToastId = toast.loading('Reconnecting...', {
          description: 'Re-establishing real-time connections'
        });

        // Listen for reconnection complete event
        const handleReconnectionComplete = () => {
          if (reconnectionToastId) {
            toast.dismiss(reconnectionToastId);
            toast.success('Connected!', {
              description: 'Real-time updates restored',
              duration: 2000
            });
          }
          window.removeEventListener('websocket-reconnection-complete', handleReconnectionComplete);
        };

        window.addEventListener('websocket-reconnection-complete', handleReconnectionComplete);

        // Failsafe: If not connected after 15 seconds, show error
        setTimeout(() => {
          // Check if still showing reconnecting toast
          const coordinator = (window as any).__reconnectionCoordinator;
          if (reconnectionToastId && coordinator?.isCurrentlyReconnecting?.()) {
            toast.dismiss(reconnectionToastId);
            toast.error('Connection issues detected', {
              description: 'Please refresh the page if problems persist',
              duration: 10000,
              action: {
                label: 'Refresh',
                onClick: () => window.location.reload()
              }
            });
          }
          window.removeEventListener('websocket-reconnection-complete', handleReconnectionComplete);
        }, 15000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
};
