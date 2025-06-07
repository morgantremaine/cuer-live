
import { useEffect } from 'react';

interface UseTeammateChangeNotificationProps {
  rundownId: string | null;
  enabled?: boolean;
}

export const useTeammateChangeNotification = ({ 
  rundownId, 
  enabled = true 
}: UseTeammateChangeNotificationProps) => {

  useEffect(() => {
    // This hook is now deprecated in favor of useRealtimeRundown
    // which handles both notifications and data synchronization more efficiently.
    // All realtime functionality has been moved to the new unified system.
    console.log('⚠️ useTeammateChangeNotification is deprecated - using useRealtimeRundown instead');
    
    return () => {
      // No cleanup needed since we're not setting up any subscriptions
    };
  }, [rundownId, enabled]);
};
