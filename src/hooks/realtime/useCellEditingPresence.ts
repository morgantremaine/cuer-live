import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';
import { debugLogger } from '@/utils/debugLogger';

interface EditingPresence {
  userId: string;
  fullName: string;
  fieldKey: string;
  lastActivity: string;
  startedAt: string;
}

export const useCellEditingPresence = (rundownId: string | undefined) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceThrottleRef = useRef<Map<string, number>>(new Map());
  const lastWarningRef = useRef<Map<string, number>>(new Map());
  
  const getUserName = useCallback(async (userId: string): Promise<string> => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();
      
      return profile?.full_name || 'Another user';
    } catch {
      return 'Another user';
    }
  }, []);

  const startEditingField = useCallback(async (fieldKey: string) => {
    if (!channelRef.current || !rundownId) return;

    const now = Date.now();
    const lastUpdate = presenceThrottleRef.current.get(fieldKey) || 0;
    
    // Throttle presence updates to max once per second per field
    if (now - lastUpdate < 1000) return;
    
    presenceThrottleRef.current.set(fieldKey, now);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fullName = await getUserName(user.id);
    
    const presenceData: EditingPresence = {
      userId: user.id,
      fullName,
      fieldKey,
      lastActivity: new Date().toISOString(),
      startedAt: new Date().toISOString()
    };

    debugLogger.realtime('📝 Starting to edit field:', fieldKey);
    await channelRef.current.track(presenceData);
  }, [rundownId, getUserName]);

  const updateFieldActivity = useCallback(async (fieldKey: string) => {
    if (!channelRef.current || !rundownId) return;

    const now = Date.now();
    const lastUpdate = presenceThrottleRef.current.get(fieldKey) || 0;
    
    // Throttle activity updates to max once per 2 seconds
    if (now - lastUpdate < 2000) return;
    
    presenceThrottleRef.current.set(fieldKey, now);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fullName = await getUserName(user.id);
    
    const presenceData: EditingPresence = {
      userId: user.id,
      fullName,
      fieldKey,
      lastActivity: new Date().toISOString(),
      startedAt: new Date().toISOString()
    };

    debugLogger.realtime('🔄 Updating activity for field:', fieldKey);
    await channelRef.current.track(presenceData);
  }, [rundownId, getUserName]);

  const stopEditingField = useCallback(async () => {
    if (!channelRef.current) return;
    
    debugLogger.realtime('✋ Stopped editing field');
    await channelRef.current.untrack();
  }, []);

  const checkForActiveEditor = useCallback(async (fieldKey: string) => {
    if (!channelRef.current || !rundownId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const presenceState = channelRef.current.presenceState();
    const now = Date.now();
    
    // Check if we already warned about this field recently (within 5 seconds)
    const lastWarning = lastWarningRef.current.get(fieldKey) || 0;
    if (now - lastWarning < 5000) return;

    // Look for other users editing this specific field
    for (const [presenceKey, presences] of Object.entries(presenceState)) {
      for (const presence of presences as any[]) {
        if (presence.userId === user.id) continue; // Skip our own presence
        if (presence.fieldKey !== fieldKey) continue; // Different field
        
        const lastActivity = new Date(presence.lastActivity).getTime();
        const timeSinceActivity = now - lastActivity;
        
        // Only warn if the other user was active within the last 4 seconds
        if (timeSinceActivity < 4000) {
          lastWarningRef.current.set(fieldKey, now);
          toast({
            title: "Another user is editing this cell",
            description: `${presence.fullName} is currently editing this field`,
            duration: 3000,
          });
          debugLogger.realtime('⚠️ Warning: Another user editing field:', { fieldKey, fullName: presence.fullName });
          break;
        }
      }
    }
  }, [rundownId]);

  // Setup realtime channel
  useEffect(() => {
    if (!rundownId) return;

    const channelName = `rundown-editing-${rundownId}`;
    debugLogger.realtime('🚀 Setting up cell editing presence channel:', channelName);
    
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: 'editing'
        }
      }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        debugLogger.realtime('🔄 Cell editing presence synced');
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        debugLogger.realtime('👋 User joined editing:', { key, newPresences });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        debugLogger.realtime('👋 User left editing:', { key, leftPresences });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          debugLogger.realtime('✅ Cell editing presence connected');
        } else if (status === 'CHANNEL_ERROR') {
          debugLogger.realtime('❌ Cell editing presence error');
        }
      });

    channelRef.current = channel;

    return () => {
      debugLogger.realtime('🧹 Cleaning up cell editing presence');
      channel.unsubscribe();
      channelRef.current = null;
      presenceThrottleRef.current.clear();
      lastWarningRef.current.clear();
    };
  }, [rundownId]);

  return {
    startEditingField,
    updateFieldActivity,
    stopEditingField,
    checkForActiveEditor
  };
};