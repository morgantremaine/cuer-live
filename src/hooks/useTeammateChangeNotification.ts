
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
  const blueprintSubscriptionRef = useRef<any>(null);
  
  useEffect(() => {
    // Skip if not enabled or missing required data
    if (!enabled || !user?.id || !rundownId) {
      return;
    }

    // Clean up any existing subscriptions
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }
    if (blueprintSubscriptionRef.current) {
      supabase.removeChannel(blueprintSubscriptionRef.current);
    }

    console.log('🔔 Setting up teammate change notifications for rundown:', rundownId);
    
    // Create unique channel IDs
    const rundownChannelId = `rundown-changes-${rundownId}`;
    const blueprintChannelId = `blueprint-changes-${rundownId}`;
    
    // Create subscription for rundown changes
    const rundownChannel = supabase
      .channel(rundownChannelId)
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
            console.log('👥 Teammate made changes to rundown, showing notification');
            
            toast({
              title: 'Teammate Updated Rundown',
              description: 'A teammate has made changes to this rundown. Please refresh the page to see the latest updates.',
              duration: 10000,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Rundown notification subscription status:', status);
      });

    // Create subscription for blueprint changes
    const blueprintChannel = supabase
      .channel(blueprintChannelId)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'blueprints',
          filter: `rundown_id=eq.${rundownId}`
        },
        (payload) => {
          console.log('📡 Blueprint update detected:', {
            blueprintId: payload.new?.id,
            rundownId: payload.new?.rundown_id,
            updatedByUserId: payload.new?.user_id,
            currentUserId: user.id
          });

          // Only show notification if the update was made by someone else
          if (payload.new?.user_id !== user.id) {
            console.log('👥 Teammate made changes to blueprint, showing notification');
            
            toast({
              title: 'Teammate Updated Blueprint',
              description: 'A teammate has made changes to this blueprint. Please refresh the page to see the latest updates.',
              duration: 10000,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Blueprint notification subscription status:', status);
      });

    subscriptionRef.current = rundownChannel;
    blueprintSubscriptionRef.current = blueprintChannel;

    // Cleanup on unmount
    return () => {
      if (subscriptionRef.current) {
        console.log('🧹 Cleaning up rundown change notifications');
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      if (blueprintSubscriptionRef.current) {
        console.log('🧹 Cleaning up blueprint change notifications');
        supabase.removeChannel(blueprintSubscriptionRef.current);
        blueprintSubscriptionRef.current = null;
      }
    };
  }, [user?.id, rundownId, enabled, toast]);

  return {
    // Could expose subscription status if needed
    isListening: !!subscriptionRef.current && !!blueprintSubscriptionRef.current
  };
};
