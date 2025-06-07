
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface UseTeammateChangeNotificationProps {
  rundownId: string | null;
  enabled?: boolean;
}

export const useTeammateChangeNotification = ({
  rundownId,
  enabled = true
}: UseTeammateChangeNotificationProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const subscriptionRef = useRef<any>(null);
  
  useEffect(() => {
    // Skip if not enabled or missing required data
    if (!enabled || !user?.id || !rundownId) {
      return;
    }

    // Clean up any existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    console.log('🔔 Setting up teammate change notifications for rundown:', rundownId);
    
    // Create unique channel ID
    const channelId = `teammate-changes-${rundownId}`;
    
    // Create new subscription
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rundowns',
          filter: `id=eq.${rundownId}`
        },
        (payload) => {
          console.log('📡 Rundown update detected:', {
            rundownId: payload.new?.id,
            updatedByUserId: payload.new?.user_id,
            currentUserId: user.id
          });

          // Only show notification if the update was made by someone else
          if (payload.new?.user_id !== user.id) {
            console.log('👥 Teammate made changes, showing notification');
            
            toast({
              title: 'Teammate Updated Rundown',
              description: 'A teammate has made changes to this rundown. Please refresh the page to see the latest updates.',
              duration: 10000,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Teammate notification subscription status:', status);
      });

    subscriptionRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (subscriptionRef.current) {
        console.log('🧹 Cleaning up teammate change notifications');
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [user?.id, rundownId, enabled, toast]);

  return {
    // Could expose subscription status if needed
    isListening: !!subscriptionRef.current
  };
};
