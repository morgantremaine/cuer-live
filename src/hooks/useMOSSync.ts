import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RundownItem } from '@/types/rundown';
import { useToast } from '@/hooks/use-toast';

interface UseMOSSyncProps {
  rundownId: string;
  teamId: string;
  enabled: boolean;
  items: RundownItem[];
  title: string;
}

export const useMOSSync = ({ rundownId, teamId, enabled, items, title }: UseMOSSyncProps) => {
  const { toast } = useToast();
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSyncedItemsRef = useRef<string>('');

  // Send MOS message to edge function
  const sendMOSMessage = useCallback(
    async (messageType: string, payload: any) => {
      try {
        const { data, error } = await supabase.functions.invoke('mos-send-message', {
          body: {
            messageType,
            teamId,
            rundownId,
            payload,
          },
        });

        if (error) {
          console.error('MOS send error:', error);
          toast({
            title: 'MOS Error',
            description: `Failed to send ${messageType} message`,
            variant: 'destructive',
          });
        } else {
          console.log(`MOS ${messageType} sent successfully`);
        }
      } catch (error) {
        console.error('MOS sync error:', error);
      }
    },
    [teamId, rundownId, toast]
  );

  // Send initial sync (roCreate)
  const sendInitialSync = useCallback(() => {
    if (!enabled) return;

    const nonFloatingItems = items.filter(item => !item.isFloating);
    sendMOSMessage('roCreate', {
      title,
      items: nonFloatingItems,
    });
  }, [enabled, items, title, sendMOSMessage]);

  // Send content update (roStorySend) with debounce
  const sendContentUpdate = useCallback(
    (item: RundownItem) => {
      if (!enabled || item.isFloating) return;

      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Set new timeout
      debounceTimeoutRef.current = setTimeout(() => {
        sendMOSMessage('roStorySend', { item });
      }, 1500); // Default debounce, will be configurable from settings
    },
    [enabled, sendMOSMessage]
  );

  // Send structural change (roElementAction)
  const sendStructuralChange = useCallback(
    (operation: 'INSERT' | 'DELETE' | 'MOVE' | 'SWAP', item?: RundownItem, targetItemId?: string) => {
      if (!enabled) return;
      if (item && item.isFloating && operation !== 'DELETE') return;

      sendMOSMessage('roElementAction', {
        operation,
        item,
        targetItemId,
      });
    },
    [enabled, sendMOSMessage]
  );

  // Send showcaller cue (roReadyToAir or roStoryTake)
  const sendShowcallerCue = useCallback(
    async (itemId: string, autoTake: boolean) => {
      if (!enabled) return;

      const item = items.find(i => i.id === itemId);
      if (!item || item.isFloating) return;

      const messageType = autoTake ? 'roStoryTake' : 'roReadyToAir';
      sendMOSMessage(messageType, { itemId });
    },
    [enabled, items, sendMOSMessage]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    sendInitialSync,
    sendContentUpdate,
    sendStructuralChange,
    sendShowcallerCue,
  };
};
