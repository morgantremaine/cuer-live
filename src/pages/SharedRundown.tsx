
import React from 'react';
import { useSharedRundownState } from '@/hooks/useSharedRundownState';
import { getVisibleColumns } from '@/utils/sharedRundownUtils';
import { SharedRundownHeader } from '@/components/shared/SharedRundownHeader';
import SharedRundownTable from '@/components/shared/SharedRundownTable';
import SharedRundownFooter from '@/components/shared/SharedRundownFooter';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';
import { useRundownAutoscroll } from '@/hooks/useRundownAutoscroll';

// Default columns to use when rundown has no columns defined
const DEFAULT_COLUMNS = [
  { id: 'segmentName', name: 'Segment Name', key: 'segmentName', isVisible: true, width: '200px' },
  { id: 'duration', name: 'Duration', key: 'duration', isVisible: true, width: '100px' },
  { id: 'startTime', name: 'Start Time', key: 'startTime', isVisible: true, width: '100px' },
  { id: 'endTime', name: 'End Time', key: 'endTime', isVisible: true, width: '100px' },
  { id: 'description', name: 'Description', key: 'description', isVisible: true, width: '300px' }
];

const SharedRundown = () => {
  const { rundownData, currentTime, currentSegmentId, loading, error } = useSharedRundownState();
  const [layoutColumns, setLayoutColumns] = useState(null);
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [layoutName, setLayoutName] = useState('Default Layout');
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(false);
  const [realtimeShowcallerState, setRealtimeShowcallerState] = useState(null);
  const { isDark, toggleTheme } = useTheme();
  
  // Better refs to prevent duplicate loads
  const layoutLoadedRef = useRef<string | null>(null);
  const isLayoutLoadingRef = useRef(false);
  const realtimeChannelRef = useRef<any>(null);

  // Get rundownId from the rundownData
  const rundownId = rundownData?.id;

  // Use real-time showcaller state if available, otherwise fall back to stored state
  const showcallerState = realtimeShowcallerState || rundownData?.showcallerState;
  const isPlaying = showcallerState?.isPlaying || false;

  // Calculate time remaining from showcaller state
  const timeRemaining = showcallerState?.timeRemaining || null;

  // Initialize autoscroll functionality
  const { scrollContainerRef } = useRundownAutoscroll({
    currentSegmentId,
    isPlaying,
    autoScrollEnabled,
    items: rundownData?.items || []
  });

  // Set up real-time subscription for showcaller state changes
  useEffect(() => {
    // Clean up existing subscription
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    // Only set up subscription if we have a rundown ID
    if (!rundownId) {
      return;
    }

    console.log('📺 Setting up real-time subscription for showcaller state:', rundownId);

    const channel = supabase
      .channel(`shared-showcaller-${rundownId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rundowns',
          filter: `id=eq.${rundownId}`
        },
        (payload) => {
          console.log('📺 Received showcaller update:', payload);
          // Only update if showcaller_state changed
          if (payload.new?.showcaller_state) {
            console.log('📺 Updating showcaller state:', payload.new.showcaller_state);
            setRealtimeShowcallerState(payload.new.showcaller_state);
          }
        }
      )
      .subscribe((status) => {
        console.log('📺 Subscription status:', status);
      });

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        console.log('📺 Cleaning up subscription');
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [rundownId]);

  // Helper function to format time remaining from seconds to string
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return '00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const handleToggleAutoScroll = () => {
    setAutoScrollEnabled(!autoScrollEnabled);
  };

  // Much more efficient layout loading
  useEffect(() => {
    const loadSharedLayout = async () => {
      // Only load if we have rundown data and haven't loaded this layout yet
      if (!rundownId || !rundownData || isLayoutLoadingRef.current) {
        return;
      }
      
      // Skip if we've already loaded layout for this rundown
      if (layoutLoadedRef.current === rundownId) {
        return;
      }
      
      setLayoutLoading(true);
      isLayoutLoadingRef.current = true;
      layoutLoadedRef.current = rundownId;
      
      try {
        // Get the shared layout configuration
        const { data: sharedLayoutData, error: sharedError } = await supabase
          .from('shared_rundown_layouts')
          .select('layout_id')
          .eq('rundown_id', rundownId)
          .maybeSingle();

        if (sharedError) {
          console.error('❌ Error loading shared layout config:', sharedError);
          // Fallback to rundown's own columns
          if (rundownData.columns && rundownData.columns.length > 0) {
            setLayoutColumns(rundownData.columns);
            setLayoutName('Rundown Layout');
          } else {
            setLayoutColumns(DEFAULT_COLUMNS);
            setLayoutName('Default Layout');
          }
          return;
        }

        // If there's a specific layout set, load it
        if (sharedLayoutData && sharedLayoutData.layout_id) {
          const { data: layoutData, error: layoutError } = await supabase
            .from('column_layouts')
            .select('columns, name')
            .eq('id', sharedLayoutData.layout_id)
            .maybeSingle();

          if (layoutError || !layoutData) {
            console.error('❌ Error loading layout:', layoutError);
            // Fallback to rundown's own columns
            if (rundownData.columns && rundownData.columns.length > 0) {
              setLayoutColumns(rundownData.columns);
              setLayoutName('Rundown Layout');
            } else {
              setLayoutColumns(DEFAULT_COLUMNS);
              setLayoutName('Default Layout');
            }
          } else {
            setLayoutColumns(layoutData.columns);
            setLayoutName(layoutData.name || 'Custom Layout');
          }
        } else {
          // No specific layout set, use rundown's own columns or default
          if (rundownData.columns && rundownData.columns.length > 0) {
            setLayoutColumns(rundownData.columns);
            setLayoutName('Rundown Layout');
          } else {
            setLayoutColumns(DEFAULT_COLUMNS);
            setLayoutName('Default Layout');
          }
        }
      } catch (error) {
        console.error('💥 Failed to load shared layout:', error);
        // Final fallback
        if (rundownData.columns && rundownData.columns.length > 0) {
          setLayoutColumns(rundownData.columns);
          setLayoutName('Rundown Layout');
        } else {
          setLayoutColumns(DEFAULT_COLUMNS);
          setLayoutName('Default Layout');
        }
      } finally {
        setLayoutLoading(false);
        isLayoutLoadingRef.current = false;
      }
    };

    // Only load layout when rundown data is available and we haven't loaded it yet
    if (rundownData && rundownId && layoutLoadedRef.current !== rundownId) {
      loadSharedLayout();
    }
  }, [rundownId, rundownData]); // Simplified dependencies

  if (loading) {
    return (
      <div className={`h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading rundown...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="text-center">
          <div className={`text-lg text-red-600 mb-2`}>Error loading rundown</div>
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{error}</div>
          <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-4`}>
            This rundown may be private or the link may be incorrect.
          </div>
        </div>
      </div>
    );
  }

  if (!rundownData) {
    return (
      <div className={`h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="text-center">
          <div className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Rundown not found</div>
          <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            This rundown may be private or the link may be incorrect.
          </div>
        </div>
      </div>
    );
  }

  if (layoutLoading) {
    return (
      <div className={`h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading layout...</div>
      </div>
    );
  }

  // Use layout columns if available, otherwise fall back to rundown's default columns, or finally to DEFAULT_COLUMNS
  const columnsToUse = layoutColumns || rundownData.columns || DEFAULT_COLUMNS;
  const visibleColumns = getVisibleColumns(columnsToUse);

  return (
    <div className={`h-screen flex flex-col ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="flex-1 flex flex-col overflow-hidden">
        <SharedRundownHeader
          title={rundownData.title}
          startTime={rundownData.startTime || '09:00:00'}
          timezone={rundownData.timezone || 'UTC'}
          layoutName={layoutName}
          currentSegmentId={currentSegmentId}
          isPlaying={isPlaying}
          timeRemaining={typeof timeRemaining === 'number' ? formatTimeRemaining(timeRemaining) : timeRemaining}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          autoScrollEnabled={autoScrollEnabled}
          onToggleAutoScroll={handleToggleAutoScroll}
        />

        <div className="flex-1 min-h-0 p-4 print:p-2">
          <SharedRundownTable
            ref={scrollContainerRef}
            items={rundownData.items}
            visibleColumns={visibleColumns}
            currentSegmentId={currentSegmentId}
            isPlaying={isPlaying}
            rundownStartTime={rundownData.startTime || '09:00:00'}
            isDark={isDark}
          />
        </div>

        <div className="print:block hidden">
          <SharedRundownFooter />
        </div>
      </div>
    </div>
  );
};

export default SharedRundown;
