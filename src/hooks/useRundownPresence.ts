
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
      const { error } = await supabase
        .from('rundown_presence')
        .upsert({
          rundown_id: rundownId,
          user_id: user.id,
          last_seen: new Date().toISOString()
        }, {
          onConflict: 'rundown_id,user_id'
        });

      if (error) {
        console.error('Error updating presence:', error);
      } else {
        console.log('Presence updated successfully');
      }
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

      console.log('Raw active users data:', data);

      // Map the data to match our ActiveUser interface
      const mappedUsers: ActiveUser[] = (data || []).map(item => ({
        user_id: item.user_id,
        last_seen: item.last_seen,
        profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
      }));

      console.log('Mapped active users:', mappedUsers);
      setActiveUsers(mappedUsers);
    } catch (error) {
      console.error('Error loading active users:', error);
    }
  }, [rundownId, user?.id]);

  // Set up presence tracking
  useEffect(() => {
    if (!rundownId || !user) {
      console.log('No rundownId or user, skipping presence setup');
      return;
    }

    console.log('Setting up presence for rundown:', rundownId, 'user:', user.id);

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
        (payload) => {
          console.log('Presence change detected:', payload);
          // Reload active users when presence changes
          loadActiveUsers();
        }
      )
      .subscribe((status) => {
        console.log('Presence subscription status:', status);
      });

    subscriptionRef.current = channel;

    return () => {
      console.log('Cleaning up presence tracking');
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
        console.log('Removing presence on unmount');
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
