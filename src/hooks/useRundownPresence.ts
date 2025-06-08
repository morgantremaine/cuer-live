
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

  // Update user's presence - simplified version
  const updatePresence = useCallback(async () => {
    if (!rundownId || !user) {
      console.log('⚠️ Cannot update presence - missing rundownId or user');
      return;
    }

    try {
      console.log('📍 Updating presence for rundown:', rundownId);
      
      const { error } = await supabase
        .from('rundown_presence')
        .upsert({
          rundown_id: rundownId,
          user_id: user.id,
          last_seen: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Error updating presence:', error);
      } else {
        console.log('✅ Presence updated successfully');
      }
    } catch (error) {
      console.error('❌ Exception updating presence:', error);
    }
  }, [rundownId, user]);

  // Load active users - simplified version
  const loadActiveUsers = useCallback(async () => {
    if (!rundownId || !user) {
      console.log('⚠️ Cannot load active users - missing rundownId or user');
      setActiveUsers([]);
      return;
    }

    try {
      console.log('👥 Loading active users for rundown:', rundownId);
      
      // Get users active in the last 5 minutes, excluding current user
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
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
        .gte('last_seen', fiveMinutesAgo)
        .neq('user_id', user.id);

      if (error) {
        console.error('❌ Error loading active users:', error);
        return;
      }

      console.log('📊 Raw active users data:', data);

      // Transform the data to match our interface
      const transformedUsers: ActiveUser[] = (data || []).map(item => ({
        user_id: item.user_id,
        last_seen: item.last_seen,
        profiles: item.profiles
      }));

      console.log('✅ Active users loaded:', transformedUsers.length, transformedUsers);
      setActiveUsers(transformedUsers);
    } catch (error) {
      console.error('❌ Exception loading active users:', error);
      setActiveUsers([]);
    }
  }, [rundownId, user]);

  // Set up presence tracking
  useEffect(() => {
    if (!rundownId || !user) {
      console.log('⚠️ Skipping presence setup - missing rundownId or user');
      return;
    }

    console.log('🚀 Setting up presence for rundown:', rundownId, 'user:', user.id);

    // Update presence immediately
    updatePresence();
    
    // Load active users initially
    loadActiveUsers();

    // Set up interval to update presence every 30 seconds
    presenceIntervalRef.current = setInterval(() => {
      updatePresence();
      loadActiveUsers(); // Also refresh the list periodically
    }, 30000);

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
          console.log('📡 Presence change detected:', payload);
          // Reload active users when presence changes
          loadActiveUsers();
        }
      )
      .subscribe((status) => {
        console.log('📡 Presence subscription status:', status);
      });

    subscriptionRef.current = channel;

    return () => {
      console.log('🧹 Cleaning up presence tracking');
      
      // Clean up interval
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
        presenceIntervalRef.current = null;
      }

      // Clean up subscription
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [rundownId, user, updatePresence, loadActiveUsers]);

  // Clean up presence on unmount
  useEffect(() => {
    return () => {
      if (rundownId && user) {
        console.log('🧹 Removing presence on unmount');
        supabase
          .from('rundown_presence')
          .delete()
          .eq('rundown_id', rundownId)
          .eq('user_id', user.id)
          .then(() => {
            console.log('✅ Cleaned up presence on unmount');
          })
          .catch((error) => {
            console.error('❌ Error cleaning up presence:', error);
          });
      }
    };
  }, [rundownId, user]);

  return {
    activeUsers,
    updatePresence
  };
};
