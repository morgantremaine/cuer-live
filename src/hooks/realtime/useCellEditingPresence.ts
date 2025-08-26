import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface CellEditingPresence {
  userId: string;
  fullName: string;
  fieldKey: string;
  lastActivity: number;
  startedAt: number;
}

export const useCellEditingPresence = (rundownId: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [presenceData, setPresenceData] = useState<Record<string, CellEditingPresence[]>>({});
  const throttleRef = useRef<{ [fieldKey: string]: number }>({});
  const lastNotificationRef = useRef<{ [fieldKey: string]: number }>({});

  // Initialize channel
  useEffect(() => {
    if (!rundownId || !user) return;

    const channelName = `rundown-editing-${rundownId}`;
    logger.info(`🔗 Joining cell editing channel: ${channelName}`);

    const channel = supabase.channel(channelName)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<CellEditingPresence>();
        setPresenceData(state);
        logger.debug('📊 Cell editing presence synced', { 
          presenceCount: Object.keys(state).length 
        });
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        logger.debug('👋 User joined cell editing', { key, count: newPresences.length });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        logger.debug('👋 User left cell editing', { key, count: leftPresences.length });
      });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        logger.info('✅ Successfully subscribed to cell editing channel');
      } else if (status === 'CHANNEL_ERROR') {
        logger.error('❌ Failed to subscribe to cell editing channel');
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        logger.info('🔌 Leaving cell editing channel');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [rundownId, user]);

  // Track editing for a specific field
  const trackEditing = (fieldKey: string) => {
    if (!channelRef.current || !user) return;

    const now = Date.now();
    
    // Throttle presence updates (max 1 per second per field)
    if (throttleRef.current[fieldKey] && now - throttleRef.current[fieldKey] < 1000) {
      return;
    }
    throttleRef.current[fieldKey] = now;

    const presence: CellEditingPresence = {
      userId: user.id,
      fullName: user.user_metadata?.full_name || user.email || 'Unknown User',
      fieldKey,
      lastActivity: now,
      startedAt: throttleRef.current[fieldKey] || now
    };

    channelRef.current.track(presence);
    logger.debug('📝 Tracking cell editing', { fieldKey, userId: user.id });
  };

  // Stop tracking editing for a specific field
  const untrackEditing = (fieldKey: string) => {
    if (!channelRef.current || !user) return;

    // Find our current presence and remove only this field
    const currentPresence = channelRef.current.presenceState<CellEditingPresence>();
    const myPresences = currentPresence[user.id] || [];
    
    // Keep all presences except the one for this field
    const remainingPresences = myPresences.filter(p => p.fieldKey !== fieldKey);
    
    if (remainingPresences.length > 0) {
      // Track with remaining presences
      remainingPresences.forEach(presence => {
        channelRef.current?.track(presence);
      });
    } else {
      // Untrack completely if no more fields being edited
      channelRef.current.untrack();
    }

    logger.debug('🛑 Stopped tracking cell editing', { fieldKey, userId: user.id });
  };

  // Check if another user is actively editing a field
  const checkForActiveEditors = (fieldKey: string): boolean => {
    if (!user) return false;

    const now = Date.now();
    const activityThreshold = 4000; // 4 seconds

    // Check all users' presence data
    for (const [userId, presences] of Object.entries(presenceData)) {
      if (userId === user.id) continue; // Skip our own presence

      const relevantPresence = presences.find(p => 
        p.fieldKey === fieldKey && 
        (now - p.lastActivity) < activityThreshold
      );

      if (relevantPresence) {
        // Only show notification once per field per minute
        const lastNotified = lastNotificationRef.current[fieldKey] || 0;
        if (now - lastNotified > 60000) {
          toast({
            title: "Another user is editing this cell",
            description: `${relevantPresence.fullName} is currently editing this field`,
            duration: 3000,
          });
          lastNotificationRef.current[fieldKey] = now;
        }
        
        logger.debug('⚠️ Active editor detected', { 
          fieldKey, 
          editor: relevantPresence.fullName,
          lastActivity: relevantPresence.lastActivity 
        });
        
        return true;
      }
    }

    return false;
  };

  // Cleanup stale presences (call periodically)
  const cleanupStalePresences = () => {
    if (!channelRef.current || !user) return;

    const now = Date.now();
    const staleThreshold = 10000; // 10 seconds
    
    const currentPresence = channelRef.current.presenceState<CellEditingPresence>();
    const myPresences = currentPresence[user.id] || [];
    
    const activePresences = myPresences.filter(p => 
      (now - p.lastActivity) < staleThreshold
    );

    // If we have stale presences, update with only active ones
    if (activePresences.length !== myPresences.length) {
      if (activePresences.length > 0) {
        activePresences.forEach(presence => {
          channelRef.current?.track(presence);
        });
      } else {
        channelRef.current.untrack();
      }
      
      logger.debug('🧹 Cleaned up stale presences', { 
        removed: myPresences.length - activePresences.length 
      });
    }
  };

  // Periodic cleanup
  useEffect(() => {
    const cleanup = setInterval(cleanupStalePresences, 5000); // Every 5 seconds
    return () => clearInterval(cleanup);
  }, [user]);

  return {
    trackEditing,
    untrackEditing,
    checkForActiveEditors,
    presenceData
  };
};
