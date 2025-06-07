import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface UseTeammateChangeNotificationProps {
  rundownId: string | null;
  enabled?: boolean;
}

export const useTeammateChangeNotification = ({ 
  rundownId, 
  enabled = true 
}: UseTeammateChangeNotificationProps) => {
  const { user } = useAuth();

  useEffect(() => {
    // This hook is now deprecated in favor of useStableRealtimeCollaboration
    // which handles both notifications and data reloading more efficiently.
    // Keeping this hook for backwards compatibility but removing the actual notification logic
    // to prevent duplicate notifications.
    
    return () => {
      // No cleanup needed since we're not setting up any subscriptions
    };
  }, [rundownId, enabled, user]);
};
