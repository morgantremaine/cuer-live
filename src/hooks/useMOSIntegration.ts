import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MOSIntegrationOptions {
  teamId: string;
  rundownId: string;
  enabled?: boolean;
}

interface SegmentData {
  id: string;
  [key: string]: any;
}

export const useMOSIntegration = ({ teamId, rundownId, enabled = true }: MOSIntegrationOptions) => {
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSegmentRef = useRef<string | null>(null);
  const debounceMs = useRef(1000);

  useEffect(() => {
    // Fetch debounce setting
    const fetchDebounce = async () => {
      const { data } = await supabase
        .from('team_mos_integrations')
        .select('debounce_ms')
        .eq('team_id', teamId)
        .single();

      if (data?.debounce_ms) {
        debounceMs.current = data.debounce_ms;
      }
    };

    fetchDebounce();
  }, [teamId]);

  const sendMOSMessage = useCallback(
    async (eventType: string, segmentId: string, segmentData?: SegmentData) => {
      if (!enabled) return;

      try {
        console.log('📡 Sending MOS message:', { eventType, segmentId });

        const { data, error } = await supabase.functions.invoke('mos-send-message', {
          body: {
            teamId,
            rundownId,
            eventType,
            segmentId,
            segmentData,
          },
        });

        if (error) throw error;

        console.log('✅ MOS message sent successfully:', data);
      } catch (error) {
        console.error('❌ Failed to send MOS message:', error);
      }
    },
    [teamId, rundownId, enabled]
  );

  const sendMOSMessageDebounced = useCallback(
    (eventType: string, segmentId: string, segmentData?: SegmentData) => {
      if (!enabled) return;

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer
      debounceTimerRef.current = setTimeout(() => {
        sendMOSMessage(eventType, segmentId, segmentData);
      }, debounceMs.current);
    },
    [sendMOSMessage, enabled]
  );

  const handleSegmentChange = useCallback(
    (newSegmentId: string | null, segmentData?: SegmentData) => {
      if (!enabled || !newSegmentId) return;

      // Skip if same segment
      if (newSegmentId === lastSegmentRef.current) return;

      console.log('🔄 Segment changed:', { from: lastSegmentRef.current, to: newSegmentId });

      lastSegmentRef.current = newSegmentId;

      // Send MOS message with debouncing
      sendMOSMessageDebounced('UPDATE', newSegmentId, segmentData);
    },
    [sendMOSMessageDebounced, enabled]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    sendMOSMessage,
    sendMOSMessageDebounced,
    handleSegmentChange,
  };
};
