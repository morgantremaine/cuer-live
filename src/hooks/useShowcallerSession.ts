import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ShowcallerSession {
  id: string;
  rundown_id: string;
  user_id: string;
  session_start: string;
  session_end?: string;
  last_activity: string;
  is_active: boolean;
  user_name?: string;
}

interface UseShowcallerSessionProps {
  rundownId: string | null;
  enabled?: boolean;
}

export const useShowcallerSession = ({ 
  rundownId, 
  enabled = true 
}: UseShowcallerSessionProps) => {
  const { user } = useAuth();
  const [isActiveSession, setIsActiveSession] = useState(false);
  const [activeSessions, setActiveSessions] = useState<ShowcallerSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const sessionIdRef = useRef<string | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();

  // Start a Showcaller session
  const startSession = useCallback(async () => {
    if (!user?.id || !rundownId || !enabled) return null;

    try {
      console.log('🎬 [Showcaller] Starting session for rundown:', rundownId);
      
      const { data, error } = await supabase
        .from('showcaller_sessions')
        .insert({
          rundown_id: rundownId,
          user_id: user.id,
          session_start: new Date().toISOString(),
          last_activity: new Date().toISOString(),
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [Showcaller] Failed to start session:', error);
        return null;
      }

      sessionIdRef.current = data.id;
      setIsActiveSession(true);
      
      console.log('✅ [Showcaller] Session started:', data.id);
      return data.id;
    } catch (error) {
      console.error('❌ [Showcaller] Session start error:', error);
      return null;
    }
  }, [user?.id, rundownId, enabled]);

  // End the current session
  const endSession = useCallback(async () => {
    if (!sessionIdRef.current) return;

    try {
      console.log('🛑 [Showcaller] Ending session:', sessionIdRef.current);
      
      const { error } = await supabase
        .from('showcaller_sessions')
        .update({
          session_end: new Date().toISOString(),
          is_active: false
        })
        .eq('id', sessionIdRef.current);

      if (error) {
        console.error('❌ [Showcaller] Failed to end session:', error);
      } else {
        console.log('✅ [Showcaller] Session ended successfully');
      }
    } catch (error) {
      console.error('❌ [Showcaller] Session end error:', error);
    } finally {
      sessionIdRef.current = null;
      setIsActiveSession(false);
    }
  }, []);

  // Update session activity (heartbeat)
  const updateActivity = useCallback(async () => {
    if (!sessionIdRef.current) return;

    try {
      const { error } = await supabase
        .from('showcaller_sessions')
        .update({
          last_activity: new Date().toISOString()
        })
        .eq('id', sessionIdRef.current);

      if (error) {
        console.warn('⚠️ [Showcaller] Failed to update activity:', error);
      }
    } catch (error) {
      console.warn('⚠️ [Showcaller] Activity update error:', error);
    }
  }, []);

  // Load active sessions for the rundown
  const loadActiveSessions = useCallback(async () => {
    if (!rundownId || !enabled) return;

    try {
      const { data, error } = await supabase
        .from('showcaller_sessions')
        .select(`
          *,
          profiles!showcaller_sessions_user_id_fkey(full_name)
        `)
        .eq('rundown_id', rundownId)
        .eq('is_active', true)
        .order('session_start', { ascending: false });

      if (error) {
        console.error('❌ [Showcaller] Failed to load sessions:', error);
        return;
      }

      const sessions = data.map(session => ({
        ...session,
        user_name: session.profiles?.full_name || 'Unknown User'
      }));

      setActiveSessions(sessions);
      
      // Check if current user has an active session
      const userSession = sessions.find(s => s.user_id === user?.id);
      if (userSession) {
        sessionIdRef.current = userSession.id;
        setIsActiveSession(true);
      }
      
      console.log('📊 [Showcaller] Loaded active sessions:', sessions.length);
    } catch (error) {
      console.error('❌ [Showcaller] Load sessions error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [rundownId, enabled, user?.id]);

  // Setup heartbeat for active sessions
  useEffect(() => {
    if (isActiveSession && sessionIdRef.current) {
      // Send heartbeat every 2 minutes
      heartbeatIntervalRef.current = setInterval(updateActivity, 120000);
      
      return () => {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
      };
    }
  }, [isActiveSession, updateActivity]);

  // Load sessions on component mount
  useEffect(() => {
    loadActiveSessions();
  }, [loadActiveSessions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isActiveSession) {
        endSession();
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [endSession, isActiveSession]);

  // Listen to session changes in realtime
  useEffect(() => {
    if (!rundownId || !enabled) return;

    const channel = supabase
      .channel(`showcaller_sessions_${rundownId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'showcaller_sessions',
          filter: `rundown_id=eq.${rundownId}`
        },
        (payload) => {
          console.log('🔄 [Showcaller] Session change:', payload);
          loadActiveSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rundownId, enabled, loadActiveSessions]);

  return {
    // Session state
    isActiveSession,
    activeSessions,
    isLoading,
    sessionId: sessionIdRef.current,
    
    // Session actions
    startSession,
    endSession,
    updateActivity,
    loadActiveSessions,
    
    // Computed values
    hasMultipleSessions: activeSessions.length > 1,
    currentUserSession: activeSessions.find(s => s.user_id === user?.id),
    otherActiveSessions: activeSessions.filter(s => s.user_id !== user?.id)
  };
};