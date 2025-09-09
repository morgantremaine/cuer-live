/**
 * SIMPLIFIED USER AWARENESS
 * 
 * Track who is currently editing which fields.
 * Shows typing indicators and prevents major conflicts.
 * Optional enhancement - can be added later.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserPresence {
  userId: string;
  userEmail?: string;
  editingField?: string;
  editingItemId?: string;
  lastSeen: number;
}

interface UseUserAwarenessProps {
  rundownId: string | null;
  userId?: string;
  userEmail?: string;
  enabled?: boolean;
}

export const useUserAwareness = ({
  rundownId,
  userId,
  userEmail,
  enabled = false // Disabled by default - can be enabled later
}: UseUserAwarenessProps) => {
  
  const [activeUsers, setActiveUsers] = useState<Map<string, UserPresence>>(new Map());
  const [myPresence, setMyPresence] = useState<UserPresence | null>(null);
  
  const channelRef = useRef<any>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const currentEditRef = useRef<{ itemId?: string; field?: string } | null>(null);

  // Broadcast current editing state
  const broadcastPresence = useCallback((editingItemId?: string, editingField?: string) => {
    if (!channelRef.current || !userId) return;

    const presence: UserPresence = {
      userId,
      userEmail,
      editingField,
      editingItemId,
      lastSeen: Date.now()
    };

    setMyPresence(presence);
    currentEditRef.current = { itemId: editingItemId, field: editingField };

    channelRef.current.track({
      user_id: userId,
      user_email: userEmail,
      editing_field: editingField,
      editing_item_id: editingItemId,
      last_seen: Date.now()
    });

    console.log('👤 User Awareness: Broadcasting presence', { editingItemId, editingField });
  }, [userId, userEmail]);

  // Start editing a field
  const startEditing = useCallback((itemId?: string, field?: string) => {
    broadcastPresence(itemId, field);
  }, [broadcastPresence]);

  // Stop editing
  const stopEditing = useCallback(() => {
    broadcastPresence();
  }, [broadcastPresence]);

  // Check if someone else is editing a field
  const isFieldBeingEdited = useCallback((itemId?: string, field?: string): UserPresence | null => {
    for (const [otherUserId, presence] of activeUsers) {
      if (otherUserId === userId) continue; // Skip self
      
      if (presence.editingItemId === itemId && presence.editingField === field) {
        // Check if recent (last 5 seconds)
        if (Date.now() - presence.lastSeen < 5000) {
          return presence;
        }
      }
    }
    return null;
  }, [activeUsers, userId]);

  // Get all active users
  const getActiveUsers = useCallback((): UserPresence[] => {
    const now = Date.now();
    return Array.from(activeUsers.values()).filter(user => 
      user.userId !== userId && (now - user.lastSeen) < 10000 // Active in last 10 seconds
    );
  }, [activeUsers, userId]);

  useEffect(() => {
    if (!rundownId || !userId || !enabled) {
      return;
    }

    console.log('👥 User Awareness: Setting up for rundown:', rundownId);

    // Create presence channel
    const channel = supabase.channel(`presence-${rundownId}`, {
      config: {
        presence: {
          key: userId
        }
      }
    });

    // Listen for presence changes
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = new Map<string, UserPresence>();
        
        Object.entries(state).forEach(([key, presences]) => {
          const presence = presences[0] as any;
          if (presence) {
            users.set(key, {
              userId: presence.user_id,
              userEmail: presence.user_email,
              editingField: presence.editing_field,
              editingItemId: presence.editing_item_id,
              lastSeen: presence.last_seen || Date.now()
            });
          }
        });
        
        setActiveUsers(users);
        console.log('👥 User Awareness: Users updated', { userCount: users.size });
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('👤 User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('👤 User left:', key, leftPresences);
      })
      .subscribe();

    channelRef.current = channel;

    // Start heartbeat
    heartbeatRef.current = setInterval(() => {
      if (currentEditRef.current) {
        broadcastPresence(currentEditRef.current.itemId, currentEditRef.current.field);
      } else {
        broadcastPresence(); // Just presence, no editing
      }
    }, 3000);

    // Initial presence broadcast
    broadcastPresence();

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      setActiveUsers(new Map());
      setMyPresence(null);
    };
  }, [rundownId, userId, enabled, broadcastPresence]);

  return {
    startEditing,
    stopEditing,
    isFieldBeingEdited,
    getActiveUsers,
    activeUserCount: activeUsers.size,
    myPresence,
    isEnabled: enabled
  };
};