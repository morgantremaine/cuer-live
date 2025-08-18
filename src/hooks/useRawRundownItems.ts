import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RundownItem } from '@/types/rundown';
import { DEMO_RUNDOWN_ID, DEMO_RUNDOWN_DATA } from '@/data/demoRundownData';

/**
 * Hook to get raw rundown items directly from database for timing calculations
 * This ensures consistent timing calculations regardless of user-specific filtering
 */
export const useRawRundownItems = (rundownId: string | null) => {
  const [rawItems, setRawItems] = useState<RundownItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!rundownId) {
      setRawItems([]);
      return;
    }

    // Handle demo rundown
    if (rundownId === DEMO_RUNDOWN_ID) {
      setRawItems(DEMO_RUNDOWN_DATA.items);
      return;
    }

    const loadRawItems = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('rundowns')
          .select('items')
          .eq('id', rundownId)
          .maybeSingle();

        if (error) {
          console.error('Error loading raw rundown items for timing:', error);
          setRawItems([]);
        } else if (data?.items && Array.isArray(data.items)) {
          setRawItems(data.items);
          console.log(`⏱️ Loaded ${data.items.length} raw items for timing calculations`);
        } else {
          setRawItems([]);
        }
      } catch (error) {
        console.error('Failed to load raw rundown items:', error);
        setRawItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadRawItems();
  }, [rundownId]);

  return { rawItems, isLoading };
};