
import React from 'react';
import { useSharedRundownState } from '@/hooks/useSharedRundownState';
import { getVisibleColumns } from '@/utils/sharedRundownUtils';
import { SharedRundownHeader } from '@/components/shared/SharedRundownHeader';
import SharedRundownTable from '@/components/shared/SharedRundownTable';
import SharedRundownFooter from '@/components/shared/SharedRundownFooter';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

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
  
  // Prevent duplicate layout loads
  const layoutLoadedRef = useRef(false);
  const rundownIdRef = useRef<string | null>(null);

  // Get rundownId from the rundownData instead of useParams
  const rundownId = rundownData?.id;

  // Load the shared layout for this rundown - optimized to prevent repeated calls
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
      
      console.log('🔍 loadSharedLayout called with:', { rundownId, rundownData: !!rundownData });
      
      setLayoutLoading(true);
      layoutLoadedRef.current = true;
      rundownIdRef.current = rundownId;
      
      try {
        console.log('🔄 Loading shared layout for rundown:', rundownId);
        
        // Get the shared layout configuration
        const { data: sharedLayoutData, error: sharedError } = await supabase
          .from('shared_rundown_layouts')
          .select('layout_id')
          .eq('rundown_id', rundownId)
          .maybeSingle();

        console.log('📊 Shared layout query result:', { sharedLayoutData, sharedError });

        if (sharedError && sharedError.code !== 'PGRST116') {
          console.error('❌ Error loading shared layout config:', sharedError);
          setLayoutColumns(null);
          setLayoutName('Default Layout');
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
            // Fallback to default
            setLayoutColumns(null);
            setLayoutName('Default Layout');
          } else if (layoutData) {
            console.log('✅ Successfully loaded layout:', layoutData.name, 'Columns:', layoutData.columns);
            setLayoutColumns(layoutData.columns);
            setLayoutName(layoutData.name || 'Custom Layout');
          } else {
            // Layout not found, fallback to default
            console.log('⚠️ Layout not found, using default');
            setLayoutColumns(null);
            setLayoutName('Default Layout');
          }
        } else {
          // No specific layout set, use default
          console.log('🎨 No shared layout configured, using default');
          setLayoutColumns(null);
          setLayoutName('Default Layout');
        }
      } catch (error) {
        console.error('💥 Failed to load shared layout:', error);
        // Fallback to default
        setLayoutColumns(null);
        setLayoutName('Default Layout');
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

  // Use layout columns if available, otherwise fall back to rundown's default columns, or finally to DEFAULT_COLUMNS
  const columnsToUse = layoutColumns || rundownData.columns || DEFAULT_COLUMNS;
  const visibleColumns = getVisibleColumns(columnsToUse);

  console.log('🎯 Final state:', {
    layoutColumns: layoutColumns ? 'loaded' : 'null',
    columnsToUse: columnsToUse?.length || 0,
    layoutName,
    rundownColumns: rundownData.columns?.length || 0,
    usingDefaultColumns: !layoutColumns && !rundownData.columns
  });

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
          layoutName={layoutName}
          currentSegmentId={currentSegmentId}
          isPlaying={isPlaying}
          timeRemaining={timeRemaining}
        />

        <div className="overflow-auto max-h-[calc(100vh-220px)] print:overflow-visible print:max-h-none">
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
