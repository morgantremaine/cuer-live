
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

  // Update user's presence using the database function to avoid conflicts
  const updatePresence = useCallback(async () => {
    if (!rundownId || !user) {
      console.log('⚠️ Cannot update presence - missing rundownId or user');
      return;
    }

    try {
      console.log('📍 Updating presence for rundown:', rundownId);
      
      // Use the database function to handle upsert properly
      const { error } = await supabase.rpc('update_rundown_presence', {
        rundown_uuid: rundownId
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

  // Load active users with proper join to profiles
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
      
      // First get the presence data
      const { data: presenceData, error: presenceError } = await supabase
        .from('rundown_presence')
        .select('user_id, last_seen')
        .eq('rundown_id', rundownId)
        .gte('last_seen', fiveMinutesAgo)
        .neq('user_id', user.id);

      if (presenceError) {
        console.error('❌ Error loading presence data:', presenceError);
        return;
      }

      if (!presenceData || presenceData.length === 0) {
        console.log('📊 No active users found');
        setActiveUsers([]);
        return;
      }

      // Get user IDs for profile lookup
      const userIds = presenceData.map(p => p.user_id);

      // Fetch profiles separately
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, profile_picture_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('❌ Error loading profiles:', profilesError);
        setActiveUsers([]);
        return;
      }

      // Combine presence and profile data
      const transformedUsers: ActiveUser[] = presenceData.map(presence => {
        const profile = profilesData?.find(p => p.id === presence.user_id);
        return {
          user_id: presence.user_id,
          last_seen: presence.last_seen,
          profiles: profile ? {
            full_name: profile.full_name,
            email: profile.email,
            profile_picture_url: profile.profile_picture_url
          } : null
        };
      });

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
        // Use async function to handle the promise properly
        const cleanupPresence = async () => {
          try {
            const { error } = await supabase
              .from('rundown_presence')
              .delete()
              .eq('rundown_id', rundownId)
              .eq('user_id', user.id);
              
            if (error) {
              console.error('❌ Error cleaning up presence:', error);
            } else {
              console.log('✅ Cleaned up presence on unmount');
            }
          } catch (error) {
            console.error('❌ Exception cleaning up presence:', error);
          }
        };
        
        cleanupPresence();
      }
    };
  }, [rundownId, user]);

  return {
    activeUsers,
    updatePresence
  };
};
