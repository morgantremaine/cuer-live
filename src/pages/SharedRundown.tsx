
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
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { logger } from '@/utils/logger';

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
  const [currentTimeRemaining, setCurrentTimeRemaining] = useState(null);
  const { isDark, toggleTheme } = useTheme();
  
  // Better refs to prevent duplicate loads and ensure cleanup
  const layoutLoadedRef = useRef<string | null>(null);
  const isLayoutLoadingRef = useRef(false);
  const realtimeChannelRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Get rundownId from the rundownData
  const rundownId = rundownData?.id;

  // Use real-time showcaller state if available, otherwise fall back to stored state
  const showcallerState = realtimeShowcallerState || rundownData?.showcallerState;
  const isPlaying = showcallerState?.isPlaying || false;

  // Calculate synchronized time remaining
  const timeRemaining = currentTimeRemaining !== null ? currentTimeRemaining : (showcallerState?.timeRemaining || null);

  // Initialize autoscroll functionality
  const { scrollContainerRef } = useRundownAutoscroll({
    currentSegmentId,
    isPlaying,
    autoScrollEnabled,
    items: rundownData?.items || []
  });

  // Enhanced timer cleanup for showcaller synchronization
  useEffect(() => {
    // Clear existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (isPlaying && showcallerState?.playbackStartTime && showcallerState?.currentSegmentId) {
      // Find the current segment to get its duration
      const currentSegment = rundownData?.items?.find(item => item.id === showcallerState.currentSegmentId);
      if (currentSegment) {
        // Convert duration to seconds
        const timeToSeconds = (timeStr: string) => {
          if (!timeStr) return 0;
          const parts = timeStr.split(':').map(Number);
          if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
          } else if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
          }
          return 0;
        };

        const segmentDuration = timeToSeconds(currentSegment.duration || '00:00');
        const playbackStartTime = showcallerState.playbackStartTime;

        // Start a timer to update time remaining in real-time
        timerRef.current = setInterval(() => {
          // Check if component is still mounted before updating state
          if (!isMountedRef.current) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return;
          }
          
          const now = Date.now();
          const elapsedSeconds = Math.floor((now - playbackStartTime) / 1000);
          const remainingSeconds = Math.max(0, segmentDuration - elapsedSeconds);
          setCurrentTimeRemaining(remainingSeconds);
        }, 1000);

        // Set initial time remaining
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - playbackStartTime) / 1000);
        const remainingSeconds = Math.max(0, segmentDuration - elapsedSeconds);
        setCurrentTimeRemaining(remainingSeconds);
      }
    } else {
      // Not playing, use the stored time remaining
      setCurrentTimeRemaining(showcallerState?.timeRemaining || null);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, showcallerState?.playbackStartTime, showcallerState?.currentSegmentId, showcallerState?.timeRemaining, rundownData?.items]);

  // Enhanced real-time subscription cleanup
  useEffect(() => {
    // Clean up existing subscription
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    // Only set up subscription if we have a rundown ID and component is mounted
    if (!rundownId || !isMountedRef.current) {
      return;
    }

    logger.log('📺 Setting up real-time subscription for showcaller state:', rundownId);

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
          // Check if component is still mounted before updating state
          if (!isMountedRef.current) return;
          
          logger.log('📺 Received showcaller update:', payload);
          // Only update if showcaller_state changed
          if (payload.new?.showcaller_state) {
            logger.log('📺 Updating showcaller state:', payload.new.showcaller_state);
            setRealtimeShowcallerState(payload.new.showcaller_state);
          }
        }
      )
      .subscribe((status) => {
        logger.log('📺 Subscription status:', status);
      });

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        logger.log('📺 Cleaning up subscription');
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

  // Fixed layout loading for shared rundowns
  useEffect(() => {
    const loadSharedLayoutForAnonymous = async () => {
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
        logger.log('🔧 Loading shared layout for rundown:', rundownId);
        
        // First, try to get the shared layout configuration
        const { data: sharedLayoutData, error: sharedError } = await supabase
          .from('shared_rundown_layouts')
          .select('layout_id')
          .eq('rundown_id', rundownId)
          .maybeSingle();

        if (!isMountedRef.current) return;

        if (sharedError) {
          logger.error('❌ Error loading shared layout config:', sharedError);
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

        // If there's a specific layout set, try to load it
        if (sharedLayoutData && sharedLayoutData.layout_id) {
          logger.log('🎨 Found shared layout ID:', sharedLayoutData.layout_id);
          
          // Always use the RPC function for anonymous users
          // This bypasses RLS issues and is specifically designed for shared layouts
          try {
            const { data: publicLayoutData, error: publicError } = await supabase.rpc(
              'get_public_layout_for_rundown', 
              { 
                rundown_uuid: rundownId,
                layout_uuid: sharedLayoutData.layout_id 
              }
            );

            if (!isMountedRef.current) return;

            if (publicError) {
              logger.error('❌ Error loading public layout via RPC:', publicError);
              throw publicError;
            } 
            
            if (publicLayoutData) {
              logger.log('✅ Successfully loaded layout via RPC:', publicLayoutData);
              setLayoutColumns(publicLayoutData.columns);
              setLayoutName(publicLayoutData.name || 'Custom Layout');
              return;
            } else {
              logger.log('⚠️ RPC returned null - layout may not be properly shared');
              throw new Error('Layout not accessible');
            }
          } catch (rpcError) {
            logger.error('❌ RPC call failed:', rpcError);
            throw rpcError;
          }
        }

        // Fallback to rundown's own columns or default
        logger.log('📋 Using fallback layout');
        if (Array.isArray(rundownData.columns) && rundownData.columns.length > 0) {
          setLayoutColumns(rundownData.columns);
          setLayoutName('Rundown Layout');
        } else {
          setLayoutColumns(DEFAULT_COLUMNS);
          setLayoutName('Default Layout');
        }

      } catch (error) {
        if (!isMountedRef.current) return;
        
        logger.error('💥 Failed to load shared layout:', error);
        // Final fallback
        if (Array.isArray(rundownData.columns) && rundownData.columns.length > 0) {
          setLayoutColumns(rundownData.columns);
          setLayoutName('Rundown Layout');
        } else {
          setLayoutColumns(DEFAULT_COLUMNS);
          setLayoutName('Default Layout');
        }
      } finally {
        if (isMountedRef.current) {
          setLayoutLoading(false);
          isLayoutLoadingRef.current = false;
        }
      }
    };

    if (rundownData && rundownId && layoutLoadedRef.current !== rundownId) {
      loadSharedLayoutForAnonymous();
    }
  }, [rundownId, rundownData]);

  // Enhanced cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      
      // Clean up all timers and subscriptions
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, []);

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
    <ErrorBoundary fallbackTitle="Shared Rundown Error">
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
            items={rundownData.items || []}
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
    </ErrorBoundary>
  );
};

export default SharedRundown;
