import { useEffect, useRef, useCallback, useState } from 'react';
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
  const [rundownMosEnabled, setRundownMosEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Fetch MOS configuration directly from rundown
    const checkRundownMOS = async () => {
      try {
        const { data: rundownData, error: rundownError } = await supabase
          .from('rundowns')
          .select('mos_enabled, mos_debounce_ms')
          .eq('id', rundownId)
          .single();

        if (rundownError) {
          console.error('Failed to fetch rundown MOS settings:', rundownError);
          setIsInitialized(true);
          return;
        }

        setRundownMosEnabled(rundownData?.mos_enabled || false);

        if (rundownData?.mos_debounce_ms) {
          debounceMs.current = rundownData.mos_debounce_ms;
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Error checking rundown MOS settings:', error);
        setIsInitialized(true);
      }
    };

    if (enabled) {
      checkRundownMOS();
    } else {
      setIsInitialized(true);
    }
  }, [rundownId, enabled]);

  const sendMOSMessage = useCallback(
    async (eventType: string, segmentId: string, segmentData?: SegmentData) => {
      if (!enabled || !isInitialized || !rundownMosEnabled) return;

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
    [teamId, rundownId, enabled, isInitialized, rundownMosEnabled]
  );

  const sendMOSMessageDebounced = useCallback(
    (eventType: string, segmentId: string, segmentData?: SegmentData) => {
      if (!enabled || !isInitialized || !rundownMosEnabled) return;

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
      if (!enabled || !isInitialized || !rundownMosEnabled || !newSegmentId) return;

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
