import React from 'react';
import { useSharedRundownState } from '@/hooks/useSharedRundownState';
import { useShowcallerTiming } from '@/hooks/useShowcallerTiming';
import { getVisibleColumns } from '@/utils/sharedRundownUtils';
import { useLocalSharedColumnOrder } from '@/hooks/useLocalSharedColumnOrder';
import { SharedRundownHeader } from '@/components/shared/SharedRundownHeader';
import SharedRundownTable from '@/components/shared/SharedRundownTable';
import SharedRundownFooter from '@/components/shared/SharedRundownFooter';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';
import { useRundownAutoscroll } from '@/hooks/useRundownAutoscroll';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { logger } from '@/utils/logger';

import { useTabFocus } from '@/hooks/useTabFocus';

// Default columns to use when rundown has no columns defined - excludes notes for shared rundown
const DEFAULT_COLUMNS = [
  { id: 'name', name: 'Segment Name', key: 'name', width: '200px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'talent', name: 'Talent', key: 'talent', width: '150px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'script', name: 'Script', key: 'script', width: '300px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'gfx', name: 'GFX', key: 'gfx', width: '150px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'video', name: 'Video', key: 'video', width: '150px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'images', name: 'Images', key: 'images', width: '150px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'duration', name: 'Duration', key: 'duration', width: '120px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'startTime', name: 'Start', key: 'startTime', width: '120px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'endTime', name: 'End', key: 'endTime', width: '120px', isCustom: false, isEditable: false, isVisible: true },
  { id: 'elapsedTime', name: 'Elapsed', key: 'elapsedTime', width: '120px', isCustom: false, isEditable: false, isVisible: true }
];

const SharedRundown = () => {
  const { rundownData, currentTime, currentSegmentId, loading, error, timeRemaining } = useSharedRundownState();
  const [layoutColumns, setLayoutColumns] = useState(null);
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [layoutName, setLayoutName] = useState('Default Layout');
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(false);
  const [realtimeShowcallerState, setRealtimeShowcallerState] = useState(null);
  const { isDark, toggleTheme } = useTheme();
  const { isTabActive } = useTabFocus();
  
  // Track tab focus transitions to only refresh when becoming active
  const prevTabActiveRef = useRef(isTabActive);
  const hasJustBecomeActive = !prevTabActiveRef.current && isTabActive;
  
  // Better refs to prevent duplicate loads and ensure cleanup
  const layoutLoadedRef = useRef<string | null>(null);
  const isLayoutLoadingRef = useRef(false);
  const isMountedRef = useRef(true);

  // Update the previous tab active state after each render
  useEffect(() => {
    prevTabActiveRef.current = isTabActive;
  });

  // Get rundownId from the rundownData
  const rundownId = rundownData?.id;

  // No more cell broadcast or real-time content updates - using polling instead

  // No manual refresh needed - polling handles all updates

  // Update browser tab title when rundown title changes
  useEffect(() => {
    const titleToUse = rundownData?.title;
    if (titleToUse && titleToUse !== 'Untitled Rundown') {
      document.title = titleToUse;
    } else {
      document.title = 'Cuer Live';
    }

    // Cleanup: reset title when component unmounts
    return () => {
      document.title = 'Cuer Live';
    };
  }, [rundownData?.title]);

  // Use real-time showcaller state if available, otherwise fall back to stored state
  const showcallerState = realtimeShowcallerState || rundownData?.showcallerState;
  const isPlaying = showcallerState?.isPlaying || false;
  
  // Local countdown state for real-time display
  const [localTimeRemaining, setLocalTimeRemaining] = useState<number>(0);
  const localTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRealtimeUpdate = useRef<number>(0);
  
  // Update local countdown when real-time state changes
  useEffect(() => {
    if (realtimeShowcallerState?.timeRemaining !== undefined) {
      const newTimeRemaining = realtimeShowcallerState.timeRemaining;
      if (newTimeRemaining !== lastRealtimeUpdate.current) {
        console.log('🔄 Updating local countdown from real-time:', newTimeRemaining);
        setLocalTimeRemaining(newTimeRemaining);
        lastRealtimeUpdate.current = newTimeRemaining;
      }
    }
  }, [realtimeShowcallerState?.timeRemaining]);
  
  // Local countdown timer
  useEffect(() => {
    if (localTimerRef.current) {
      clearInterval(localTimerRef.current);
      localTimerRef.current = null;
    }
    
    if (isPlaying && localTimeRemaining > 0) {
      localTimerRef.current = setInterval(() => {
        setLocalTimeRemaining(prev => {
          const newValue = Math.max(0, prev - 1);
          if (newValue === 0) {
            if (localTimerRef.current) {
              clearInterval(localTimerRef.current);
              localTimerRef.current = null;
            }
          }
          return newValue;
        });
      }, 1000);
    }
    
    return () => {
      if (localTimerRef.current) {
        clearInterval(localTimerRef.current);
        localTimerRef.current = null;
      }
    };
  }, [isPlaying, localTimeRemaining > 0]);
  
  // IMPORTANT: Use local countdown when playing, otherwise use stored state
  const currentTimeRemaining = isPlaying && realtimeShowcallerState ? 
    localTimeRemaining : 
    (rundownData?.showcallerState?.timeRemaining || 0);
  
  // Use current segment from real-time state when available
  const realtimeCurrentSegmentId = realtimeShowcallerState?.currentSegmentId || currentSegmentId;

  // Use the unified timing calculation from useShowcallerTiming hook (same as main showcaller)
  const timingStatus = useShowcallerTiming({
    items: rundownData?.items || [],
    rundownStartTime: rundownData?.startTime || '09:00:00',
    timezone: rundownData?.timezone || 'UTC',
    isPlaying,
    currentSegmentId: realtimeCurrentSegmentId,
    timeRemaining: currentTimeRemaining
  });

  // Initialize autoscroll functionality
  const { scrollContainerRef } = useRundownAutoscroll({
    currentSegmentId: realtimeCurrentSegmentId,
    isPlaying,
    autoScrollEnabled,
    items: rundownData?.items || []
  });

  // Helper function to format time remaining from seconds to string (using same logic as main showcaller)
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

  // Simplified layout loading using the updated RPC function
  useEffect(() => {
    const loadSharedLayout = async () => {
      if (!rundownId || !rundownData || isLayoutLoadingRef.current || !isMountedRef.current) {
        return;
      }
      
      if (layoutLoadedRef.current === rundownId) {
        return;
      }
      
      setLayoutLoading(true);
      isLayoutLoadingRef.current = true;
      layoutLoadedRef.current = rundownId;
      
      try {
        // The RPC function now always returns the correct layout (custom or default)
        const { data: sharedLayoutData, error: rpcError } = await supabase
          .rpc('get_shared_layout_for_public_rundown', { rundown_uuid: rundownId });

        if (!isMountedRef.current) return;

        if (rpcError) {
          logger.error('Error loading shared layout:', rpcError);
          // Use default columns as final fallback
          setLayoutColumns(DEFAULT_COLUMNS);
          setLayoutName('Default Layout');
          return;
        }

        // The RPC now handles all the logic for us
        if (sharedLayoutData && sharedLayoutData.columns) {
          setLayoutColumns(sharedLayoutData.columns);
          setLayoutName(sharedLayoutData.layout_name || 'Default Layout');
        } else {
          // Final fallback
          setLayoutColumns(DEFAULT_COLUMNS);
          setLayoutName('Default Layout');
        }
      } catch (error) {
        if (!isMountedRef.current) return;
        logger.error('Exception loading shared layout:', error);
        
        // Final fallback
        setLayoutColumns(DEFAULT_COLUMNS);
        setLayoutName('Default Layout');
      } finally {
        if (isMountedRef.current) {
          setLayoutLoading(false);
          isLayoutLoadingRef.current = false;
        }
      }
    };

    if (rundownData && rundownId && layoutLoadedRef.current !== rundownId) {
      loadSharedLayout();
    }
  }, [rundownId, rundownData]);

  // Enhanced cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Determine columns early so hooks are always called in the same order
  const columnsToUse = layoutColumns || rundownData?.columns || DEFAULT_COLUMNS;

  // Use local column ordering for anonymous users to persist their preferred column order
  const { orderedColumns, reorderColumns } = useLocalSharedColumnOrder(columnsToUse, rundownId || '');
  const visibleColumns = getVisibleColumns(orderedColumns);

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

  const displayData = rundownData;

  return (
    <ErrorBoundary fallbackTitle="Shared Rundown Error">
      <div className={`h-screen flex flex-col ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="flex-1 flex flex-col overflow-hidden">
          
          <SharedRundownHeader
            title={displayData.title}
            startTime={displayData.startTime || '09:00:00'}
            timezone={displayData.timezone || 'UTC'}
            layoutName={layoutName}
            currentSegmentId={realtimeCurrentSegmentId}
            isPlaying={isPlaying}
            timeRemaining={typeof currentTimeRemaining === 'number' ? formatTimeRemaining(currentTimeRemaining) : currentTimeRemaining}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            autoScrollEnabled={autoScrollEnabled}
            onToggleAutoScroll={handleToggleAutoScroll}
            items={displayData.items || []}
          />

          <div className="flex-1 min-h-0 p-4 print:p-2">
            <SharedRundownTable
              ref={scrollContainerRef}
              items={displayData.items}
              visibleColumns={visibleColumns}
              currentSegmentId={currentSegmentId}
              isPlaying={isPlaying}
              rundownStartTime={displayData.startTime || '09:00:00'}
              isDark={isDark}
              onReorderColumns={reorderColumns}
            />
          </div>

          <div className="print:block hidden">
            <SharedRundownFooter />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default SharedRundown;