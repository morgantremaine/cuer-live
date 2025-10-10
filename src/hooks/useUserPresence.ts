import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface UserPresenceState {
  userId: string;
  sessionId: string;
  joinedAt: string;
  lastSeen: string;
  rundownId?: string;
  hasUnsavedChanges?: boolean;
  userFullName?: string;
}

interface UseUserPresenceOptions {
  rundownId?: string;
  onSessionConflict?: () => void;
  enabled?: boolean;
  hasUnsavedChanges?: boolean;
}

export const useUserPresence = ({ 
  rundownId, 
  onSessionConflict,
  enabled = true, 
  hasUnsavedChanges = false,
}: UseUserPresenceOptions = {}) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [hasSessionConflict, setHasSessionConflict] = useState(false);
  const [otherUsers, setOtherUsers] = useState<UserPresenceState[]>([]);
  
  const channelRef = useRef<any>(null);
  const sessionIdRef = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const joinedAtRef = useRef<string>(new Date().toISOString());
  const lastSeenUpdateRef = useRef<NodeJS.Timeout>();
  const hasUnsavedRef = useRef<boolean>(!!hasUnsavedChanges);

  // Channel name - global presence or rundown-specific
  const channelName = rundownId ? `presence_rundown_${rundownId}` : 'presence_global';

  useEffect(() => {
    if (!enabled || !user) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel(channelName);

    const userPresence: UserPresenceState = {
      userId: user.id,
      sessionId: sessionIdRef.current,
      joinedAt: joinedAtRef.current,
      lastSeen: new Date().toISOString(),
      rundownId,
      hasUnsavedChanges: !!hasUnsavedChanges,
      userFullName: user.user_metadata?.full_name || user.email || 'Unknown User',
    };

    // Set up presence event handlers
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        
        // Check for session conflicts (same user, different session)
        const allPresences = Object.values(presenceState).flat() as any[];
        const myPresences = allPresences.filter((p: any) => p.userId === user.id);
        const otherPresences = allPresences.filter((p: any) => p.userId !== user.id);
        
        setOtherUsers(otherPresences as UserPresenceState[]);
        
        // If there's more than one session for this user, handle conflict
        if (myPresences.length > 1) {
          const sortedSessions = myPresences.sort((a, b) => 
            new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
          );
          
          // If this isn't the newest session, we need to disconnect
          const newestSession = sortedSessions[sortedSessions.length - 1];
          if (newestSession.sessionId !== sessionIdRef.current) {
            console.log('🚫 Session conflict detected - this is an older session');
            setHasSessionConflict(true);
            onSessionConflict?.();
            
            toast.error('Session ended - logged in elsewhere', {
              duration: Infinity,
              action: {
                label: 'Reload',
                onClick: () => window.location.reload()
              }
            });
          }
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const joinedUsers = newPresences as any[];
        
        // Check if someone with same userId joined with different session
        joinedUsers.forEach((presence: any) => {
          if (presence.userId === user.id && presence.sessionId !== sessionIdRef.current) {
            // Another session for this user joined - this session should disconnect
            setHasSessionConflict(true);
            onSessionConflict?.();
          }
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        // User left
      });

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        
        // Track this user's presence
        const trackStatus = await channel.track(userPresence);
        
      } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
        setIsConnected(false);
      }
    });

    channelRef.current = channel;

    return () => {
      if (lastSeenUpdateRef.current) {
        clearTimeout(lastSeenUpdateRef.current);
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      setIsConnected(false);
    };
  }, [enabled, user, channelName, rundownId, hasSessionConflict, onSessionConflict]);

  // Update presence immediately when hasUnsavedChanges changes
  useEffect(() => {
    if (!enabled || !user || !channelRef.current || hasSessionConflict) return;
    
    hasUnsavedRef.current = !!hasUnsavedChanges;
    
    const presenceData = {
      userId: user.id,
      sessionId: sessionIdRef.current,
      joinedAt: joinedAtRef.current,
      lastSeen: new Date().toISOString(),
      rundownId,
      hasUnsavedChanges: hasUnsavedRef.current,
      userFullName: user.user_metadata?.full_name || user.email || 'Unknown User',
    };
    
    channelRef.current.track(presenceData);
  }, [hasUnsavedChanges, enabled, user, rundownId, hasSessionConflict]);

  // Method to manually disconnect (for logout)
  const disconnect = async () => {
    if (channelRef.current && !hasSessionConflict) {
      await channelRef.current.untrack();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsConnected(false);
    }
  };

  return {
    isConnected,
    hasSessionConflict,
    otherUsers,
    disconnect,
    sessionId: sessionIdRef.current
  };
};