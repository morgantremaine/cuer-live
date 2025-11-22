import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MOSIntegrationOptions {
  teamId: string;
  rundownId: string;
  enabled?: boolean;
  triggerOnShowcaller?: boolean;
  triggerOnEditorial?: boolean;
}

interface SegmentData {
  id: string;
  [key: string]: any;
}

export const useMOSIntegration = ({ 
  teamId, 
  rundownId, 
  enabled = true,
  triggerOnShowcaller = true,
  triggerOnEditorial = true 
}: MOSIntegrationOptions) => {
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSegmentRef = useRef<string | null>(null);
  const debounceMs = useRef(1000);
  const [rundownMosEnabled, setRundownMosEnabled] = useState(false);
  const [rundownTriggerShowcaller, setRundownTriggerShowcaller] = useState(true);
  const [rundownTriggerEditorial, setRundownTriggerEditorial] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Fetch MOS configuration directly from rundown
    const checkRundownMOS = async () => {
      try {
        const { data: rundownData, error: rundownError } = await supabase
          .from('rundowns')
          .select('mos_enabled, mos_debounce_ms, mos_trigger_on_showcaller, mos_trigger_on_editorial')
          .eq('id', rundownId)
          .single();

        if (rundownError) {
          console.error('Failed to fetch rundown MOS settings:', rundownError);
          setIsInitialized(true);
          return;
        }

        setRundownMosEnabled(rundownData?.mos_enabled || false);
        setRundownTriggerShowcaller(rundownData?.mos_trigger_on_showcaller ?? true);
        setRundownTriggerEditorial(rundownData?.mos_trigger_on_editorial ?? true);

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

  const sendShowcallerMessage = useCallback(
    async (eventType: string, segmentId: string, segmentData?: SegmentData) => {
      if (!enabled || !isInitialized || !rundownMosEnabled || !rundownTriggerShowcaller) return;

      try {
        console.log('📡 Sending MOS Showcaller message:', { eventType, segmentId });

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

        console.log('✅ MOS Showcaller message sent successfully:', data);
      } catch (error) {
        console.error('❌ Failed to send MOS Showcaller message:', error);
      }
    },
    [teamId, rundownId, enabled, isInitialized, rundownMosEnabled, rundownTriggerShowcaller]
  );

  const sendEditorialMessage = useCallback(
    async (eventType: string, segmentId: string, segmentData?: SegmentData) => {
      if (!enabled || !isInitialized || !rundownMosEnabled || !rundownTriggerEditorial) return;

      try {
        console.log('📡 Sending MOS Editorial message:', { eventType, segmentId });

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

        console.log('✅ MOS Editorial message sent successfully:', data);
      } catch (error) {
        console.error('❌ Failed to send MOS Editorial message:', error);
      }
    },
    [teamId, rundownId, enabled, isInitialized, rundownMosEnabled, rundownTriggerEditorial]
  );

  const sendShowcallerMessageDebounced = useCallback(
    (eventType: string, segmentId: string, segmentData?: SegmentData) => {
      if (!enabled || !isInitialized || !rundownMosEnabled || !rundownTriggerShowcaller) return;

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer
      debounceTimerRef.current = setTimeout(() => {
        sendShowcallerMessage(eventType, segmentId, segmentData);
      }, debounceMs.current);
    },
    [sendShowcallerMessage, enabled, isInitialized, rundownMosEnabled, rundownTriggerShowcaller]
  );

  const sendEditorialMessageDebounced = useCallback(
    (eventType: string, segmentId: string, segmentData?: SegmentData) => {
      if (!enabled || !isInitialized || !rundownMosEnabled || !rundownTriggerEditorial) return;

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer
      debounceTimerRef.current = setTimeout(() => {
        sendEditorialMessage(eventType, segmentId, segmentData);
      }, debounceMs.current);
    },
    [sendEditorialMessage, enabled, isInitialized, rundownMosEnabled, rundownTriggerEditorial]
  );

  const handleSegmentChange = useCallback(
    (newSegmentId: string | null, segmentData?: SegmentData) => {
      if (!enabled || !isInitialized || !rundownMosEnabled || !rundownTriggerShowcaller || !newSegmentId) return;

      // Skip if same segment
      if (newSegmentId === lastSegmentRef.current) return;

      console.log('🔄 Showcaller segment changed:', { from: lastSegmentRef.current, to: newSegmentId });

      lastSegmentRef.current = newSegmentId;

      // Send showcaller MOS message with debouncing
      sendShowcallerMessageDebounced('UPDATE', newSegmentId, segmentData);
    },
    [sendShowcallerMessageDebounced, enabled, isInitialized, rundownMosEnabled, rundownTriggerShowcaller]
  );

  const handleEditorialChange = useCallback(
    (segmentId: string, segmentData?: SegmentData, eventType: string = 'UPDATE') => {
      if (!enabled || !isInitialized || !rundownMosEnabled || !rundownTriggerEditorial) return;

      console.log('🔄 Editorial change:', { segmentId, eventType });

      // Send editorial MOS message with debouncing
      sendEditorialMessageDebounced(eventType, segmentId, segmentData);
    },
    [sendEditorialMessageDebounced, enabled, isInitialized, rundownMosEnabled, rundownTriggerEditorial]
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
    sendShowcallerMessage,
    sendEditorialMessage,
    sendShowcallerMessageDebounced,
    sendEditorialMessageDebounced,
    handleSegmentChange,
    handleEditorialChange,
  };
};
