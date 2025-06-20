import React from 'react';
import { useSharedRundownState } from '@/hooks/useSharedRundownState';
import { getVisibleColumns } from '@/utils/sharedRundownUtils';
import { SharedRundownHeader } from '@/components/shared/SharedRundownHeader';
import SharedRundownTable from '@/components/shared/SharedRundownTable';
import SharedRundownFooter from '@/components/shared/SharedRundownFooter';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';

// Default columns to use when rundown has no columns defined
const DEFAULT_COLUMNS = [
  { id: 'segmentName', name: 'Segment Name', key: 'segmentName', isVisible: true, width: '200px' },
  { id: 'duration', name: 'Duration', key: 'duration', isVisible: true, width: '100px' },
  { id: 'startTime', name: 'Start Time', key: 'startTime', isVisible: true, width: '100px' },
  { id: 'endTime', name: 'End Time', key: 'endTime', isVisible: true, width: '100px' },
  { id: 'description', name: 'Description', key: 'description', isVisible: true, width: '300px' }
];

const SharedRundown = () => {
  const { rundownData, currentTime, currentSegmentId, loading, error, timeRemaining } = useSharedRundownState();
  const [layoutColumns, setLayoutColumns] = useState(null);
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [layoutName, setLayoutName] = useState('Default Layout');
  const { isDark, toggleTheme } = useTheme();
  
  // Prevent duplicate layout loads
  const layoutLoadedRef = useRef(false);
  const rundownIdRef = useRef<string | null>(null);

  // Get rundownId from the rundownData instead of useParams
  const rundownId = rundownData?.id;

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

  // Load the shared layout for this rundown - updated to work for anonymous users
  useEffect(() => {
    const loadSharedLayout = async () => {
      // Only load if we have new rundown data and haven't loaded this layout yet
      if (!rundownId || !rundownData || layoutLoading) {
        return;
      }
      
      // Skip if we've already loaded layout for this rundown
      if (layoutLoadedRef.current && rundownIdRef.current === rundownId) {
        return;
      }
      
      console.log('🔍 loadSharedLayout called with:', { 
        rundownId, 
        rundownData: !!rundownData,
        rundownVisibility: rundownData.visibility,
        rundownColumns: rundownData.columns?.length || 0
      });
      
      setLayoutLoading(true);
      layoutLoadedRef.current = true;
      rundownIdRef.current = rundownId;
      
      try {
        console.log('🔄 Loading shared layout for rundown:', rundownId);
        console.log('📋 Rundown visibility:', rundownData.visibility);
        console.log('📋 Rundown columns count:', rundownData.columns?.length || 0);
        
        // Always try to load shared layout first, regardless of visibility
        // The RLS policies will handle access control
        console.log('🔄 Attempting to load shared layout...');
        
        // Get the shared layout configuration - this now works for anonymous users thanks to RLS updates
        const { data: sharedLayoutData, error: sharedError } = await supabase
          .from('shared_rundown_layouts')
          .select('layout_id')
          .eq('rundown_id', rundownId)
          .maybeSingle();

        console.log('📊 Shared layout query result:', { sharedLayoutData, sharedError });

        if (sharedError) {
          console.error('❌ Error loading shared layout config:', sharedError);
          // Fallback to rundown's own columns if shared layout fails
          if (rundownData.columns && rundownData.columns.length > 0) {
            console.log('🔄 Falling back to rundown columns after shared layout error');
            setLayoutColumns(rundownData.columns);
            setLayoutName('Rundown Layout');
          } else {
            console.log('🔄 Using default columns after shared layout error');
            setLayoutColumns(DEFAULT_COLUMNS);
            setLayoutName('Default Layout');
          }
          setLayoutLoading(false);
          return;
        }

        // If there's a specific layout set, load it
        if (sharedLayoutData && sharedLayoutData.layout_id) {
          console.log('🎯 Found shared layout ID:', sharedLayoutData.layout_id);
          
          const { data: layoutData, error: layoutError } = await supabase
            .from('column_layouts')
            .select('columns, name')
            .eq('id', sharedLayoutData.layout_id)
            .maybeSingle();

          console.log('📋 Layout query result:', { layoutData, layoutError });

          if (layoutError) {
            console.error('❌ Error loading layout:', layoutError);
            // Fallback to rundown's own columns if layout loading fails
            if (rundownData.columns && rundownData.columns.length > 0) {
              console.log('🔄 Falling back to rundown columns after layout error');
              setLayoutColumns(rundownData.columns);
              setLayoutName('Rundown Layout');
            } else {
              console.log('🔄 Using default columns after layout error');
              setLayoutColumns(DEFAULT_COLUMNS);
              setLayoutName('Default Layout');
            }
          } else if (layoutData) {
            console.log('✅ Successfully loaded shared layout:', layoutData.name, 'Columns:', layoutData.columns?.length || 0);
            setLayoutColumns(layoutData.columns);
            setLayoutName(layoutData.name || 'Custom Layout');
          } else {
            // Layout not found, fallback to rundown columns or default
            console.log('⚠️ Shared layout not found, falling back');
            if (rundownData.columns && rundownData.columns.length > 0) {
              console.log('🔄 Using rundown columns as fallback');
              setLayoutColumns(rundownData.columns);
              setLayoutName('Rundown Layout');
            } else {
              console.log('🔄 Using default columns as final fallback');
              setLayoutColumns(DEFAULT_COLUMNS);
              setLayoutName('Default Layout');
            }
          }
        } else {
          // No specific layout set, use rundown's own columns or default
          console.log('🎨 No shared layout configured');
          if (rundownData.columns && rundownData.columns.length > 0) {
            console.log('🔄 Using rundown columns');
            setLayoutColumns(rundownData.columns);
            setLayoutName('Rundown Layout');
          } else {
            console.log('🔄 Using default columns');
            setLayoutColumns(DEFAULT_COLUMNS);
            setLayoutName('Default Layout');
          }
        }
      } catch (error) {
        console.error('💥 Failed to load shared layout:', error);
        // Fallback to rundown's own columns or default
        if (rundownData.columns && rundownData.columns.length > 0) {
          console.log('🔄 Using rundown columns as final fallback');
          setLayoutColumns(rundownData.columns);
          setLayoutName('Rundown Layout');
        } else {
          console.log('🔄 Using default columns as final fallback');
          setLayoutColumns(DEFAULT_COLUMNS);
          setLayoutName('Default Layout');
        }
      } finally {
        setLayoutLoading(false);
      }
    };

    // Reset layout loading flag when rundownId changes
    if (rundownIdRef.current !== rundownId) {
      layoutLoadedRef.current = false;
    }

    loadSharedLayout();
  }, [rundownId, rundownData, layoutLoading]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading rundown...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
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
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="text-center">
          <div className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Rundown not found</div>
          <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            This rundown may be private or the link may be incorrect.
          </div>
        </div>
      </div>
    );
  }

  // Use layout columns if available, otherwise fall back to rundown's default columns, or finally to DEFAULT_COLUMNS
  const columnsToUse = layoutColumns || rundownData.columns || DEFAULT_COLUMNS;
  const visibleColumns = getVisibleColumns(columnsToUse);

  console.log('🎯 Final state:', {
    layoutColumns: layoutColumns ? 'loaded' : 'null',
    columnsToUse: columnsToUse?.length || 0,
    layoutName,
    rundownColumns: rundownData.columns?.length || 0,
    usingDefaultColumns: !layoutColumns && !rundownData.columns,
    rundownVisibility: rundownData.visibility
  });

  // Determine if showcaller is playing and use the real-time calculated time remaining
  const showcallerState = rundownData.showcallerState;
  const isPlaying = showcallerState?.isPlaying || false;

  if (layoutLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading layout...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="p-4 print:p-2">
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
        />

        <SharedRundownTable
          items={rundownData.items}
          visibleColumns={visibleColumns}
          currentSegmentId={currentSegmentId}
          isPlaying={isPlaying}
          rundownStartTime={rundownData.startTime || '09:00:00'}
          isDark={isDark}
        />

        <SharedRundownFooter />
      </div>
    </div>
  );
};

export default SharedRundown;
