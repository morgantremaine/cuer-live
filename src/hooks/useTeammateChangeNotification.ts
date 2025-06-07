
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
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
    if (!enabled || !rundownId || !user) return;

    let rundownChannel: any;
    let blueprintChannel: any;

    const setupNotifications = async () => {
      // Listen for rundown changes
      rundownChannel = supabase
        .channel(`rundown-changes-${rundownId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'rundowns',
            filter: `id=eq.${rundownId}`
          },
          (payload) => {
            // Only show notification if the change wasn't made by current user
            if (payload.new && typeof payload.new === 'object' && 'user_id' in payload.new && payload.new.user_id !== user.id) {
              toast.info('Rundown updated by teammate', {
                description: 'The rundown has been modified by another team member.'
              });
            }
          }
        )
        .subscribe();

      // Listen for blueprint changes
      blueprintChannel = supabase
        .channel(`blueprint-changes-${rundownId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'blueprints',
            filter: `rundown_id=eq.${rundownId}`
          },
          (payload) => {
            // Only show notification if the change wasn't made by current user
            if (payload.new && typeof payload.new === 'object' && 'user_id' in payload.new && payload.new.user_id !== user.id) {
              toast.info('Blueprint updated by teammate', {
                description: 'The blueprint has been modified by another team member.'
              });
            }
          }
        )
        .subscribe();
    };

    setupNotifications();

    return () => {
      if (rundownChannel) {
        supabase.removeChannel(rundownChannel);
      }
      if (blueprintChannel) {
        supabase.removeChannel(blueprintChannel);
      }
    };
  }, [rundownId, enabled, user]);
};
