
import React from 'react';
import { useSharedRundownState } from '@/hooks/useSharedRundownState';
import { getVisibleColumns } from '@/utils/sharedRundownUtils';
import { SharedRundownHeader } from '@/components/shared/SharedRundownHeader';
import SharedRundownTable from '@/components/shared/SharedRundownTable';
import SharedRundownFooter from '@/components/shared/SharedRundownFooter';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const SharedRundown = () => {
  const { rundownData, currentTime, currentSegmentId, loading, error, timeRemaining } = useSharedRundownState();
  const [searchParams] = useSearchParams();
  const [layoutColumns, setLayoutColumns] = useState(null);
  const [layoutLoading, setLayoutLoading] = useState(false);
  
  const layoutId = searchParams.get('layout');

  // Load specific layout if layout parameter is provided
  useEffect(() => {
    const loadLayout = async () => {
      if (!layoutId || !rundownData) return;
      
      setLayoutLoading(true);
      try {
        const { data, error } = await supabase
          .from('column_layouts')
          .select('columns')
          .eq('id', layoutId)
          .maybeSingle();

        if (error) {
          console.error('Error loading layout:', error);
        } else if (data?.columns) {
          setLayoutColumns(data.columns);
        }
      } catch (error) {
        console.error('Failed to load layout:', error);
      } finally {
        setLayoutLoading(false);
      }
    };

    loadLayout();
  }, [layoutId, rundownData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg text-gray-600">Loading rundown...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-2">Error loading rundown</div>
          <div className="text-sm text-gray-600">{error}</div>
          <div className="text-xs text-gray-500 mt-4">
            This rundown may be private or the link may be incorrect.
          </div>
        </div>
      </div>
    );
  }

  if (!rundownData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-lg text-gray-600 mb-2">Rundown not found</div>
          <div className="text-sm text-gray-500">
            This rundown may be private or the link may be incorrect.
          </div>
        </div>
      </div>
    );
  }

  // Use layout columns if available, otherwise fall back to rundown's default columns
  const columnsToUse = layoutColumns || rundownData.columns;
  const visibleColumns = getVisibleColumns(columnsToUse);

  // Determine if showcaller is playing and use the real-time calculated time remaining
  const showcallerState = rundownData.showcallerState;
  const isPlaying = showcallerState?.isPlaying || false;

  if (layoutLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg text-gray-600">Loading layout...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="p-4 print:p-2">
        <SharedRundownHeader
          title={rundownData.title}
          startTime={rundownData.startTime || '09:00:00'}
          timezone={rundownData.timezone || 'UTC'}
        />

        <div className="overflow-auto max-h-[calc(100vh-220px)]">
          <SharedRundownTable
            items={rundownData.items}
            visibleColumns={visibleColumns}
            currentSegmentId={currentSegmentId}
            isPlaying={isPlaying}
            rundownStartTime={rundownData.startTime || '09:00:00'}
          />
        </div>

        <SharedRundownFooter />
      </div>
    </div>
  );
};

export default SharedRundown;
