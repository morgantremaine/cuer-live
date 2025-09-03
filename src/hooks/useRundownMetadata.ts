import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface UseRundownMetadataOptions {
  rundownId: string;
}

export const useRundownMetadata = ({ rundownId }: UseRundownMetadataOptions) => {
  const [title, setTitle] = useState<string>('Untitled Rundown');
  const [startTime, setStartTime] = useState<string>('09:00:00');
  const [timezone, setTimezone] = useState<string>('America/New_York');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      if (!rundownId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('rundowns')
          .select('title, start_time, timezone')
          .eq('id', rundownId)
          .single();
        if (error) throw error;
        if (data) {
          setTitle(data.title ?? 'Untitled Rundown');
          setStartTime(data.start_time ?? '09:00:00');
          setTimezone(data.timezone ?? 'America/New_York');
        }
        logger.info('📄 Loaded rundown metadata', { rundownId });
      } catch (err) {
        logger.error('Failed to load rundown metadata', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [rundownId]);

  const updateTitle = useCallback(async (newTitle: string) => {
    if (!rundownId) return;
    setTitle(newTitle);
    const { error } = await supabase
      .from('rundowns')
      .update({ title: newTitle })
      .eq('id', rundownId);
    if (error) {
      logger.error('Failed to update title', error);
    }
  }, [rundownId]);

  const updateStartTime = useCallback(async (newStart: string) => {
    if (!rundownId) return;
    setStartTime(newStart);
    const { error } = await supabase
      .from('rundowns')
      .update({ start_time: newStart })
      .eq('id', rundownId);
    if (error) {
      logger.error('Failed to update start time', error);
    }
  }, [rundownId]);

  const updateTimezone = useCallback(async (newTz: string) => {
    if (!rundownId) return;
    setTimezone(newTz);
    const { error } = await supabase
      .from('rundowns')
      .update({ timezone: newTz })
      .eq('id', rundownId);
    if (error) {
      logger.error('Failed to update timezone', error);
    }
  }, [rundownId]);

  return {
    loading,
    title,
    startTime,
    timezone,
    updateTitle,
    updateStartTime,
    updateTimezone,
  };
};