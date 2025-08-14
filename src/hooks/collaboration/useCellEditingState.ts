import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface CellEditingState {
  userId: string;
  userEmail: string;
  fieldKey: string;
  timestamp: number;
}

interface UseCellEditingStateProps {
  rundownId: string | null;
  enabled?: boolean;
}

export const useCellEditingState = ({ rundownId, enabled = true }: UseCellEditingStateProps) => {
  const { user } = useAuth();
  const [editingStates, setEditingStates] = useState<Map<string, CellEditingState>>(new Map());
  const [currentlyEditing, setCurrentlyEditing] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();

  // Get field key for a cell
  const getFieldKey = useCallback((itemId: string, fieldName: string) => {
    return `${itemId}-${fieldName}`;
  }, []);

  // Check if a cell is being edited by another user
  const isCellBeingEdited = useCallback((itemId: string, fieldName: string) => {
    const fieldKey = getFieldKey(itemId, fieldName);
    const state = editingStates.get(fieldKey);
    return state && state.userId !== user?.id;
  }, [editingStates, getFieldKey, user?.id]);

  // Get editing user info for a cell
  const getCellEditingUser = useCallback((itemId: string, fieldName: string) => {
    const fieldKey = getFieldKey(itemId, fieldName);
    const state = editingStates.get(fieldKey);
    return state && state.userId !== user?.id ? state : null;
  }, [editingStates, getFieldKey, user?.id]);

  // Start editing a cell
  const startEditing = useCallback(async (itemId: string, fieldName: string) => {
    if (!rundownId || !user || !enabled) return false;

    const fieldKey = getFieldKey(itemId, fieldName);
    
    // Check if already being edited by another user
    if (isCellBeingEdited(itemId, fieldName)) {
      return false;
    }

    // Mark as currently editing
    setCurrentlyEditing(fieldKey);

    // Broadcast editing state
    const editingState = {
      userId: user.id,
      userEmail: user.email || '',
      fieldKey,
      timestamp: Date.now()
    };

    try {
      // Use presence to broadcast editing state
      if (subscriptionRef.current) {
        await subscriptionRef.current.track({
          ...editingState,
          editing: true
        });
      }

      // Update local state
      setEditingStates(prev => new Map(prev.set(fieldKey, editingState)));
      
      return true;
    } catch (error) {
      console.error('Failed to start editing:', error);
      return false;
    }
  }, [rundownId, user, enabled, getFieldKey, isCellBeingEdited]);

  // Stop editing a cell
  const stopEditing = useCallback(async (itemId: string, fieldName: string) => {
    if (!rundownId || !user || !enabled) return;

    const fieldKey = getFieldKey(itemId, fieldName);
    
    // Clear current editing state
    setCurrentlyEditing(null);

    // Broadcast stop editing
    try {
      if (subscriptionRef.current) {
        await subscriptionRef.current.track({
          userId: user.id,
          userEmail: user.email || '',
          fieldKey,
          timestamp: Date.now(),
          editing: false
        });
      }

      // Remove from local state
      setEditingStates(prev => {
        const newMap = new Map(prev);
        newMap.delete(fieldKey);
        return newMap;
      });
    } catch (error) {
      console.error('Failed to stop editing:', error);
    }
  }, [rundownId, user, enabled, getFieldKey]);

  // Clean up stale editing states
  const cleanupStaleStates = useCallback(() => {
    const now = Date.now();
    const staleThreshold = 30000; // 30 seconds

    setEditingStates(prev => {
      const newMap = new Map();
      for (const [key, state] of prev) {
        if (now - state.timestamp < staleThreshold) {
          newMap.set(key, state);
        }
      }
      return newMap;
    });
  }, []);

  // Handle presence updates
  const handlePresenceUpdate = useCallback((presenceState: any) => {
    const newStates = new Map<string, CellEditingState>();

    // Process all presence entries
    Object.values(presenceState).forEach((presences: any) => {
      presences.forEach((presence: any) => {
        if (presence.editing && presence.userId !== user?.id) {
          newStates.set(presence.fieldKey, {
            userId: presence.userId,
            userEmail: presence.userEmail,
            fieldKey: presence.fieldKey,
            timestamp: presence.timestamp
          });
        }
      });
    });

    setEditingStates(newStates);
  }, [user?.id]);

  // Set up presence subscription
  useEffect(() => {
    if (!rundownId || !user || !enabled) return;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    const channel = supabase.channel(`cell-editing-${rundownId}`)
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        handlePresenceUpdate(presenceState);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('New user joined editing session:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left editing session:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Cell editing presence connected');
        }
      });

    subscriptionRef.current = channel;

    // Set up heartbeat to clean up stale states
    heartbeatIntervalRef.current = setInterval(cleanupStaleStates, 10000);

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [rundownId, user, enabled, handlePresenceUpdate, cleanupStaleStates]);

  // Clean up current editing on unmount
  useEffect(() => {
    return () => {
      if (currentlyEditing && rundownId && user) {
        const [itemId, fieldName] = currentlyEditing.split('-', 2);
        if (itemId && fieldName) {
          stopEditing(itemId, fieldName);
        }
      }
    };
  }, [currentlyEditing, rundownId, user, stopEditing]);

  return {
    isCellBeingEdited,
    getCellEditingUser,
    startEditing,
    stopEditing,
    currentlyEditing: currentlyEditing ? currentlyEditing.split('-', 2) : null,
    editingStates: Array.from(editingStates.values())
  };
};