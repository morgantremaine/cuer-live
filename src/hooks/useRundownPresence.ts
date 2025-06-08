
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface ActiveUser {
  user_id: string;
  profiles: {
    full_name: string | null;
    email: string;
    profile_picture_url: string | null;
  } | null;
  last_seen: string;
}

export const useRundownPresence = (rundownId: string | null) => {
  const { user } = useAuth();
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionRef = useRef<any>(null);

  // Update user's presence
  const updatePresence = useCallback(async () => {
    if (!rundownId || !user) return;

    try {
      await supabase.rpc('update_rundown_presence', {
        rundown_uuid: rundownId
      });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [rundownId, user]);

  // Load active users
  const loadActiveUsers = useCallback(async () => {
    if (!rundownId) return;

    try {
      const { data, error } = await supabase
        .from('rundown_presence')
        .select(`
          user_id,
          last_seen,
          profiles!inner(
            full_name,
            email,
            profile_picture_url
          )
        `)
        .eq('rundown_id', rundownId)
        .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
        .neq('user_id', user?.id || ''); // Exclude current user

      if (error) {
        console.error('Error loading active users:', error);
        return;
      }

      setActiveUsers(data || []);
    } catch (error) {
      console.error('Error loading active users:', error);
    }
  }, [rundownId, user?.id]);

  // Set up presence tracking
  useEffect(() => {
    if (!rundownId || !user) return;

    // Update presence immediately
    updatePresence();

    // Set up interval to update presence every 30 seconds
    presenceIntervalRef.current = setInterval(updatePresence, 30000);

    // Load active users initially
    loadActiveUsers();

    // Set up real-time subscription for presence changes
    const channel = supabase
      .channel(`rundown-presence-${rundownId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rundown_presence',
          filter: `rundown_id=eq.${rundownId}`
        },
        () => {
          // Reload active users when presence changes
          loadActiveUsers();
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      // Clean up interval
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }

      // Clean up subscription
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [rundownId, user, updatePresence, loadActiveUsers]);

  // Clean up presence on unmount
  useEffect(() => {
    return () => {
      if (rundownId && user) {
        // Remove user's presence when leaving
        supabase
          .from('rundown_presence')
          .delete()
          .eq('rundown_id', rundownId)
          .eq('user_id', user.id)
          .then(() => {
            console.log('Cleaned up presence on unmount');
          });
      }
    };
  }, []);

  return {
    activeUsers,
    updatePresence
  };
};
