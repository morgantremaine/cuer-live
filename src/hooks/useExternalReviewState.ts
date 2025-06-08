
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface ExternalReviewData {
  id: string;
  title: string;
  items: any[];
  columns: any[];
  timezone: string;
  startTime: string;
  external_notes: { [key: string]: string };
}

export const useExternalReviewState = () => {
  const { id } = useParams<{ id: string }>();
  const [rundownData, setRundownData] = useState<ExternalReviewData | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Timer effect for current time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load rundown data
  useEffect(() => {
    const loadRundown = async () => {
      if (!id) return;

      try {
        setLoading(true);
        
        const { data, error: fetchError } = await supabase
          .from('rundowns')
          .select('*')
          .eq('id', id)
          .eq('visibility', 'external_review')
          .single();

        if (fetchError) {
          console.error('Error loading rundown:', fetchError);
          setError('Failed to load rundown');
          return;
        }

        if (!data) {
          setError('Rundown not found or not available for external review');
          return;
        }

        setRundownData({
          id: data.id,
          title: data.title,
          items: data.items || [],
          columns: data.columns || [],
          timezone: data.timezone || 'UTC',
          startTime: data.start_time || '09:00:00',
          external_notes: data.external_notes || {}
        });

        // Set current segment based on time
        if (data.items && data.items.length > 0) {
          const firstRegularItem = data.items.find((item: any) => item.type === 'regular');
          if (firstRegularItem) {
            setCurrentSegmentId(firstRegularItem.id);
          }
        }

      } catch (err) {
        console.error('Error loading rundown:', err);
        setError('Failed to load rundown');
      } finally {
        setLoading(false);
      }
    };

    loadRundown();
  }, [id]);

  // Subscribe to real-time updates for external notes
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel('external-review-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rundowns',
          filter: `id=eq.${id}`
        },
        (payload) => {
          console.log('📡 External review update received:', payload);
          if (payload.new?.external_notes) {
            setRundownData(prev => prev ? {
              ...prev,
              external_notes: payload.new.external_notes
            } : null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const updateExternalNote = useCallback(async (itemId: string, note: string) => {
    if (!id || !rundownData) return;

    try {
      const updatedNotes = {
        ...rundownData.external_notes,
        [itemId]: note
      };

      const { error } = await supabase
        .from('rundowns')
        .update({ external_notes: updatedNotes })
        .eq('id', id);

      if (error) {
        console.error('Error updating external note:', error);
        return;
      }

      // Update local state immediately for responsiveness
      setRundownData(prev => prev ? {
        ...prev,
        external_notes: updatedNotes
      } : null);

    } catch (err) {
      console.error('Error updating external note:', err);
    }
  }, [id, rundownData]);

  return {
    rundownData,
    currentTime,
    currentSegmentId,
    loading,
    error,
    updateExternalNote
  };
};
