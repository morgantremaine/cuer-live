
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useSharedRundownState } from '@/hooks/useSharedRundownState';
import { useShowcallerTiming } from '@/hooks/useShowcallerTiming';
import { useADViewConnectionHealth } from '@/hooks/useADViewConnectionHealth';
import { Clock, Plus, X, EyeOff, Eye, Play, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getRowNumber } from '@/utils/sharedRundownUtils';
import { timeToSeconds, secondsToTime, calculateItemsWithTiming } from '@/utils/rundownCalculations';
import CuerLogo from '@/components/common/CuerLogo';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ADView = () => {
  const params = useParams<{ id: string }>();
  const rundownId = params.id || '';
  
  const { 
    rundownData, 
    currentTime, 
    currentSegmentId, 
    loading, 
    error, 
    timeRemaining,
    forceRefresh,
    setOnPollSuccess
  } = useSharedRundownState();
  
  // Silent refresh function for health monitoring
  const silentRefresh = useCallback(async () => {
    if (forceRefresh) {
      await forceRefresh();
    }
  }, [forceRefresh]);
  
  // Connection health monitoring with auto-refresh capability
  const {
    showConnectionWarning,
    consecutiveFailures,
    markPollReceived,
    markBroadcastReceived
  } = useADViewConnectionHealth({
    rundownId,
    enabled: !!rundownId && !loading,
    onSilentRefresh: silentRefresh,
    staleThresholdMs: 60000, // 60 seconds
    healthCheckIntervalMs: 30000 // 30 seconds
  });
  
  // Register poll success callback
  useEffect(() => {
    if (setOnPollSuccess) {
      setOnPollSuccess(markPollReceived);
    }
  }, [setOnPollSuccess, markPollReceived]);
  
  // Track showcaller state changes as "broadcasts received"
  const prevShowcallerStateRef = useRef(rundownData?.showcallerState);
  useEffect(() => {
    if (rundownData?.showcallerState && 
        rundownData.showcallerState !== prevShowcallerStateRef.current) {
      markBroadcastReceived();
      prevShowcallerStateRef.current = rundownData.showcallerState;
    }
  }, [rundownData?.showcallerState, markBroadcastReceived]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [showScript, setShowScript] = useState(true);
  const scriptContainerRef = useRef<HTMLDivElement>(null);
  const scriptContentRef = useRef<HTMLDivElement>(null);
  const [scriptFontSize, setScriptFontSize] = useState('1.3vw');
  
  // Refs for dynamic segment calculation
  const segmentsContainerRef = useRef<HTMLDivElement>(null);
  const measureRowRef = useRef<HTMLDivElement>(null);
  const [maxNextSegments, setMaxNextSegments] = useState(3); // Default fallback

  // Check if showcaller is playing and get timing data
  const isShowcallerPlaying = rundownData?.showcallerState?.isPlaying || false;
  const showcallerState = rundownData?.showcallerState;

  // Use the same timing hook as the main rundown for consistent calculations
  const timingStatus = useShowcallerTiming({
    items: rundownData?.items || [],
    rundownStartTime: rundownData?.startTime || '09:00:00',
    timezone: rundownData?.timezone || 'UTC',
    isPlaying: isShowcallerPlaying,
    currentSegmentId: currentSegmentId || '',
    timeRemaining: timeRemaining || 0
  });

  // Helper function to check if script is null (case-insensitive)
  const isNullScript = (script: string) => {
    const trimmed = script.trim();
    return trimmed.toLowerCase() === '[null]';
  };

  // Helper function to check if there's meaningful script content
  const hasScriptContent = (script: string | undefined) => {
    if (!script) return false;
    const trimmed = script.trim();
    return trimmed !== '' && !isNullScript(trimmed);
  };

  // Render script with bracket formatting (same as teleprompter)
  const renderScriptWithBrackets = (text: string) => {
    if (isNullScript(text)) {
      return null;
    }

    const bracketRegex = /\[([^\[\]{}]+)(?:\{([^}]+)\})?\]/g;
    
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = bracketRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {text.slice(lastIndex, match.index)}
          </span>
        );
      }

      const bracketText = match[1];
      const colorName = match[2]?.toLowerCase();

      let backgroundColor = 'white';
      let textColor = 'black';

      if (colorName) {
        const colorMap: { [key: string]: string } = {
          'red': '#ef4444',
          'blue': '#3b82f6',
          'green': '#22c55e',
          'yellow': '#eab308',
          'purple': '#a855f7',
          'orange': '#f97316',
          'pink': '#ec4899',
          'gray': '#6b7280',
          'grey': '#6b7280',
          'cyan': '#06b6d4',
          'lime': '#84cc16',
          'indigo': '#6366f1',
          'teal': '#14b8a6',
          'amber': '#f59e0b',
          'emerald': '#10b981',
          'violet': '#8b5cf6',
          'rose': '#f43f5e',
          'slate': '#64748b',
          'stone': '#78716c',
          'neutral': '#737373',
          'zinc': '#71717a'
        };
        
        backgroundColor = colorMap[colorName] || colorName;
        textColor = 'white';
      }

      parts.push(
        <span
          key={`bracket-${match.index}`}
          className="py-0.5 px-2 inline-block rounded mx-1"
          style={{ 
            backgroundColor,
            color: textColor
          }}
        >
          {bracketText}
        </span>
      );

      lastIndex = bracketRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.slice(lastIndex)}
        </span>
      );
    }

    return parts.length > 0 ? parts : <span>{text}</span>;
  };

  // Get storage key based on rundown ID
  const getStorageKey = () => {
    return rundownData?.id ? `ad-view-columns-${rundownData.id}` : 'ad-view-columns-default';
  };

  // Load selected columns from localStorage on mount and when rundown changes
  useEffect(() => {
    if (rundownData?.id) {
      const storageKey = getStorageKey();
      const savedColumns = localStorage.getItem(storageKey);
      if (savedColumns) {
        try {
          const parsedColumns = JSON.parse(savedColumns);
          if (Array.isArray(parsedColumns)) {
            setSelectedColumns(parsedColumns);
          }
        } catch (error) {
          console.error('Error parsing saved columns:', error);
        }
      }
    }
  }, [rundownData?.id]);

  // Save selected columns to localStorage whenever they change
  useEffect(() => {
    if (rundownData?.id && selectedColumns.length > 0) {
      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(selectedColumns));
    }
  }, [selectedColumns, rundownData?.id]);

  // Calculate items with proper timing using the same method as main rundown
  const calculatedItems = useMemo(() => {
    if (!rundownData?.items || !rundownData?.startTime) return [];
    return calculateItemsWithTiming(rundownData.items, rundownData.startTime);
  }, [rundownData?.items, rundownData?.startTime]);

  // Dynamically generate available columns based on rundown data
  const availableColumns = useMemo(() => {
    const columns = [
      { key: 'talent', name: 'Talent' },
      { key: 'script', name: 'Script' },
      { key: 'gfx', name: 'GFX' },
      { key: 'video', name: 'Video' },
      { key: 'images', name: 'Images' },
      { key: 'notes', name: 'Notes' },
      { key: 'duration', name: 'Duration' }
    ];

    // Add custom columns from rundown data - prioritize the columns definition
    if (rundownData?.columns) {
      rundownData.columns.forEach(col => {
        if (col.isCustom && !columns.find(c => c.key === col.key)) {
          columns.push({
            key: col.key,
            name: col.name
          });
        }
      });
    }

    // Extract custom fields from the customFields objects in rundown items
    if (rundownData?.items && rundownData.items.length > 0) {
      const customFieldKeys = new Set<string>();
      
      rundownData.items.forEach(item => {
        if (item.customFields && typeof item.customFields === 'object') {
          Object.keys(item.customFields).forEach(key => {
            // Only include fields that have meaningful content in at least one item
            const hasContent = rundownData.items.some(i => 
              i.customFields?.[key] && String(i.customFields[key]).trim() !== ''
            );
            if (hasContent) {
              customFieldKeys.add(key);
            }
          });
        }
      });

      // Add custom field columns
      customFieldKeys.forEach(key => {
        if (!columns.find(c => c.key === key)) {
          columns.push({
            key: key,
            name: key.charAt(0).toUpperCase() + key.slice(1)
          });
        }
      });
    }

    return columns;
  }, [rundownData?.columns, rundownData?.items]);

  // Filter out header items for timing-based navigation
  const timedItems = rundownData?.items?.filter(item => item.type !== 'header') || [];
  
  // Find current segment and its index in the timed items
  const currentSegment = timedItems.find(item => item.id === currentSegmentId);
  const currentTimedIndex = timedItems.findIndex(item => item.id === currentSegmentId);
  
  // Get segments based on current position and maximum allowed
  const previousSegments = currentTimedIndex >= 0 ? [
    currentTimedIndex >= 1 ? timedItems[currentTimedIndex - 1] : null
  ] : [null];
  
  // Dynamically generate next segments based on calculated maximum
  const nextSegments = useMemo(() => {
    if (currentTimedIndex < 0) return Array(maxNextSegments).fill(null);
    
    const segments = [];
    for (let i = 1; i <= maxNextSegments; i++) {
      const nextIndex = currentTimedIndex + i;
      segments.push(nextIndex < timedItems.length ? timedItems[nextIndex] : null);
    }
    return segments;
  }, [currentTimedIndex, timedItems, maxNextSegments]);

  // Dynamic calculation of maximum next segments based on available space
  useEffect(() => {
    if (!segmentsContainerRef.current || !measureRowRef.current) return;

    const calculateMaxSegments = () => {
      const container = segmentsContainerRef.current;
      const measureRow = measureRowRef.current;
      
      if (!container || !measureRow) return;

      // Get container height minus header banner space
      const containerHeight = container.clientHeight;
      const headerBannerHeight = 60; // Approximate height of header banner
      const availableHeight = containerHeight - headerBannerHeight;
      
      // Measure the height of a single row including additional columns
      const rowHeight = measureRow.offsetHeight;
      
      if (rowHeight === 0 || availableHeight <= 0) return;
      
      // Calculate how many rows can fit
      // Reserve space for: current row + 1 previous row + controls at bottom
      const reservedRowsHeight = rowHeight * 2; // current + prev
      const controlsHeight = 60; // Approximate height of column controls
      const availableForNext = availableHeight - reservedRowsHeight - controlsHeight;
      
      // Calculate maximum next segments (minimum 1, maximum 6)
      const maxPossible = Math.floor(availableForNext / rowHeight);
      const calculatedMax = Math.max(1, Math.min(6, maxPossible));
      
      console.log('Dynamic segments calculation:', {
        containerHeight,
        availableHeight,
        rowHeight,
        availableForNext,
        maxPossible,
        calculatedMax,
        selectedColumnsCount: selectedColumns.length
      });
      
      setMaxNextSegments(calculatedMax);
    };

    // Initial calculation
    calculateMaxSegments();

    // Recalculate on window resize
    const handleResize = () => {
      setTimeout(calculateMaxSegments, 100);
    };

    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [selectedColumns, currentSegmentId, segmentsContainerRef.current?.clientHeight]);

  // Find the current header section based on the current segment
  const getCurrentHeaderInfo = () => {
    if (!currentSegmentId || !rundownData?.items || rundownData.items.length === 0) {
      return { letter: '', name: '' };
    }

    // Find the index of the current segment in the full items array
    const currentSegmentIndex = rundownData.items.findIndex(item => item.id === currentSegmentId);
    
    if (currentSegmentIndex === -1) {
      return { name: '' };
    }

    // Look backwards from the current segment to find the most recent header
    for (let i = currentSegmentIndex; i >= 0; i--) {
      const item = rundownData.items[i];
      if (item.type === 'header') {
        return { name: item.name || '' };
      }
    }

    return { name: '' };
  };

  const currentHeaderInfo = getCurrentHeaderInfo();

  // Calculate show elapsed time using the same logic as useShowcallerTiming
  const showElapsedTime = (() => {
    if (!isShowcallerPlaying || !currentSegmentId || !rundownData?.items) {
      return '00:00:00';
    }

    const currentSegmentIndex = rundownData.items.findIndex(item => item.id === currentSegmentId);
    if (currentSegmentIndex === -1) {
      return '00:00:00';
    }

    // Sum up durations of all completed segments
    let showcallerElapsedSeconds = 0;
    
    for (let i = 0; i < currentSegmentIndex; i++) {
      const item = rundownData.items[i];
      if (item.type === 'regular' && !item.isFloating && !item.isFloated) {
        showcallerElapsedSeconds += timeToSeconds(item.duration || '00:00');
      }
    }
    
    // Add elapsed time within current segment
    const currentSegmentItem = rundownData.items[currentSegmentIndex];
    if (currentSegmentItem?.duration) {
      const currentSegmentDuration = timeToSeconds(currentSegmentItem.duration);
      const elapsedInCurrentSegment = currentSegmentDuration - (timeRemaining || 0);
      showcallerElapsedSeconds += Math.max(0, elapsedInCurrentSegment);
    }

    return secondsToTime(showcallerElapsedSeconds);
  })();

  // Calculate show remaining time based on total runtime minus elapsed
  const showRemainingTime = (() => {
    if (!isShowcallerPlaying || !rundownData?.items) {
      return '00:00:00';
    }

    // Calculate total runtime (sum of all non-floated, non-header item durations)
    const totalRuntimeSeconds = rundownData.items.reduce((acc, item) => {
      if (item.type === 'header' || item.isFloating || item.isFloated) return acc;
      return acc + timeToSeconds(item.duration || '00:00');
    }, 0);

    // Get current show elapsed time in seconds
    const showElapsedSeconds = timeToSeconds(showElapsedTime);
    
    // Calculate remaining time
    const remainingSeconds = Math.max(0, totalRuntimeSeconds - showElapsedSeconds);
    
    return secondsToTime(remainingSeconds);
  })();

  // Calculate current item elapsed time using the same logic as main showcaller system
  const currentItemElapsed = (() => {
    if (!currentSegment?.duration || !isShowcallerPlaying || timeRemaining === null || timeRemaining === undefined) {
      return '00:00';
    }
    
    // Get the segment duration in seconds
    const segmentDurationSeconds = timeToSeconds(currentSegment.duration);
    
    // Calculate elapsed time as: total duration - remaining time
    const elapsedSeconds = Math.max(0, segmentDurationSeconds - timeRemaining);
    
    // Format as MM:SS
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  })();

  // Helper to check if a color should be applied (skip white/no color)
  const hasCustomColor = (color: string | null | undefined) => {
    if (!color) return false;
    const normalized = color.toLowerCase();
    return normalized !== '#ffffff' && normalized !== '#fff' && normalized !== 'white';
  };

  // Get segment display info with row numbers, color, and additional column data
  const getSegmentInfo = (segment: any) => {
    if (!segment || !rundownData?.items) return { 
      name: '--', 
      rowNumber: '', 
      columnData: {},
      color: null as string | null
    };
    
    // Find the original index in the full items array (including headers)
    const originalIndex = rundownData.items.findIndex(item => item.id === segment.id);
    const rowNumber = getRowNumber(originalIndex, rundownData.items);
    const name = segment.name || segment.segmentName || '--';
    
    // Extract data for selected columns
    const columnData: { [key: string]: string } = {};
    selectedColumns.forEach(columnKey => {
      // First check if it's a standard field
      let value = segment[columnKey] || '';
      
      // If not found in standard fields, check customFields
      if (!value && segment.customFields && segment.customFields[columnKey]) {
        value = segment.customFields[columnKey];
      }
      
      columnData[columnKey] = value;
    });
    
    return { name, rowNumber, columnData, color: segment.color || null };
  };

  // Get info for all segments
  const prev1Info = previousSegments[0] ? getSegmentInfo(previousSegments[0]) : { name: '--', rowNumber: '', columnData: {}, color: null };
  const currInfo = currentSegment ? getSegmentInfo(currentSegment) : { name: '--', rowNumber: '', columnData: {}, color: null };
  
  // Dynamic next segment info based on calculated maximum
  const nextSegmentInfos = nextSegments.map(segment => 
    segment ? getSegmentInfo(segment) : { name: '--', rowNumber: '', columnData: {}, color: null }
  );

  // Add a column to display
  const addColumn = (columnKey: string) => {
    if (!selectedColumns.includes(columnKey)) {
      setSelectedColumns([...selectedColumns, columnKey]);
    }
    setShowColumnSelector(false);
  };

  // Remove a column from display
  const removeColumn = (columnKey: string) => {
    setSelectedColumns(selectedColumns.filter(key => key !== columnKey));
  };

  // Get available columns that aren't already selected
  const availableUnselectedColumns = availableColumns.filter(
    col => !selectedColumns.includes(col.key)
  );

  // Render additional column data for a segment
  const renderColumnData = (columnData: { [key: string]: string }) => {
    return selectedColumns.map(columnKey => {
      const columnName = availableColumns.find(col => col.key === columnKey)?.name || columnKey;
      const value = columnData[columnKey] || '--';
      
      return (
        <div key={columnKey} className="text-sm text-gray-400 mt-1">
          <span className="font-semibold">{columnName}:</span> {value}
        </div>
      );
    });
  };

  // Format time remaining
  const formatTimeRemaining = (seconds: number | null) => {
    if (seconds === null || seconds === undefined) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine if script should be shown based on content availability
  const shouldShowScript = showScript && currentSegment && hasScriptContent(currentSegment.script);

  // Determine if timing boxes should be shown based on showcaller state
  const shouldShowTiming = isShowcallerPlaying;

  // Calculate dynamic font size for script based on content and container height
  useEffect(() => {
    if (!shouldShowScript || !scriptContainerRef.current || !scriptContentRef.current || !currentSegment?.script) {
      return;
    }

    const container = scriptContainerRef.current;
    const script = currentSegment.script;
    
    // Skip scaling for [null] scripts or empty content
    if (isNullScript(script) || !hasScriptContent(script)) {
      setScriptFontSize('1.3vw');
      return;
    }

    // Get the actual available height of the container
    const containerHeight = container.clientHeight - 32; // Account for padding
    const containerWidth = container.clientWidth - 32; // Account for padding
    
    if (containerHeight <= 0 || containerWidth <= 0) {
      return;
    }

    // Create a temporary element to measure text height
    const measureElement = document.createElement('div');
    measureElement.style.position = 'absolute';
    measureElement.style.visibility = 'hidden';
    measureElement.style.width = `${containerWidth}px`;
    measureElement.style.whiteSpace = 'pre-wrap';
    measureElement.style.lineHeight = '1.4';
    measureElement.style.wordBreak = 'break-words';
    measureElement.style.overflow = 'hidden';
    measureElement.textContent = script;
    
    document.body.appendChild(measureElement);
    
    const baseFontSize = Math.min(window.innerWidth * 0.013, window.innerHeight * 0.025); // 1.3vw equivalent
    const maxFontSize = Math.min(window.innerWidth * 0.03, window.innerHeight * 0.04); // Up to 3vw max
    
    // Binary search for the optimal font size
    let minSize = baseFontSize * 0.3; // Minimum reasonable size
    let maxSize = maxFontSize;
    let optimalSize = baseFontSize;
    
    // Use binary search to find the largest font size that fits
    for (let i = 0; i < 20; i++) { // Limit iterations
      const testSize = (minSize + maxSize) / 2;
      measureElement.style.fontSize = `${testSize}px`;
      
      if (measureElement.scrollHeight <= containerHeight) {
        optimalSize = testSize;
        minSize = testSize;
      } else {
        maxSize = testSize;
      }
      
      // If the range is small enough, break
      if (maxSize - minSize < 0.5) {
        break;
      }
    }
    
    document.body.removeChild(measureElement);
    
    // Convert back to vw units for consistency
    const vwSize = (optimalSize / window.innerWidth) * 100;
    setScriptFontSize(`${Math.max(0.8, vwSize).toFixed(2)}vw`); // Ensure minimum readable size
    
  }, [shouldShowScript, currentSegment?.script, scriptContainerRef.current?.clientHeight, scriptContainerRef.current?.clientWidth]);

  // Recalculate font size on window resize
  useEffect(() => {
    const handleResize = () => {
      if (shouldShowScript && currentSegment?.script && scriptContainerRef.current) {
        // Small delay to ensure container dimensions are updated
        setTimeout(() => {
          setScriptFontSize(prev => prev); // Trigger recalculation
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [shouldShowScript, currentSegment?.script]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black text-white flex items-center justify-center">
        <div className="text-[2vw]">Loading...</div>
      </div>
    );
  }

  if (error || !rundownData) {
    return (
      <div className="h-screen w-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-[2vw] text-red-400 mb-[1vh]">Error loading rundown</div>
          <div className="text-[1.5vw] text-zinc-400">{error || 'Rundown not found'}</div>
        </div>
      </div>
    );
  }

  // Dynamic grid layout based on what should be shown
  const getGridLayout = () => {
    if (shouldShowTiming && shouldShowScript) {
      return 'grid-cols-12'; // Left timing (2) + Center segments (6) + Right script (4)
    } else if (shouldShowTiming && !shouldShowScript) {
      return 'grid-cols-8'; // Left timing (2) + Center segments (6)
    } else if (!shouldShowTiming && shouldShowScript) {
      return 'grid-cols-10'; // Center segments (6) + Right script (4)
    } else {
      return 'grid-cols-6'; // Center segments only (6)
    }
  };

  return (
    <ErrorBoundary fallbackTitle="AD View Error">
      <div className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden relative">
        {/* Connection Warning - unobtrusive corner warning */}
        {showConnectionWarning && (
          <div className="absolute bottom-4 left-4 z-50 bg-yellow-900/90 border border-yellow-600 rounded-lg px-3 py-2 flex items-center gap-2 text-yellow-200 text-sm">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>Connection issue - refresh when possible ({consecutiveFailures}/5)</span>
          </div>
        )}
        
        {/* Header */}
        <div className="bg-gray-900 border-b border-zinc-700 px-[1vw] py-[0.5vh]">
          <div className="grid grid-cols-[1fr_3fr_1fr] gap-[1.5vw] items-center">
            {/* Left Column - Timing Status */}
            <div className="flex justify-start">
              <div className="text-center min-w-[20vw]">
                <div className="text-[clamp(0.9rem,1.1vw,1.6rem)] text-zinc-400 font-semibold">TIMING STATUS</div>
                <div className={`text-[clamp(1.3rem,2.7vw,4rem)] font-bold font-mono min-h-[2vh] flex items-center justify-center truncate ${
                  !isShowcallerPlaying ? 'text-green-400' :
                  timingStatus.isOnTime ? 'text-green-400' :
                  timingStatus.isAhead ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {!isShowcallerPlaying ? 'PAUSED' :
                   timingStatus.isOnTime ? 'ON TIME' :
                   timingStatus.isAhead ? `Under -${timingStatus.timeDifference}` :
                   `Over +${timingStatus.timeDifference}`}
                </div>
              </div>
            </div>
            
            {/* Center Column - Logo and Title */}
            <div className="flex items-center justify-center">
              <div className="flex items-center space-x-[1vw]">
                <CuerLogo 
                  className="h-[6vh] w-auto flex-shrink-0"
                  isDark={true}
                  alt="Cuer Logo"
                />
                <div className="text-[clamp(1.2rem,1.8vw,3rem)] font-bold text-white text-center leading-tight">
                  {rundownData.title}
                </div>
              </div>
            </div>
            
            {/* Right Column - Time of Day */}
            <div className="flex justify-end">
              <div className="text-center min-w-[20vw]">
                <div className="text-[clamp(0.9rem,1.1vw,1.6rem)] text-zinc-400 font-semibold">TIME OF DAY</div>
                <div className="text-[clamp(1.3rem,2.9vw,4.5rem)] font-mono font-bold text-blue-400">
                  {currentTime.toLocaleTimeString('en-GB', { hour12: false })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 px-0 py-0">
          <div className={`grid gap-[1.5vh] h-full p-[1vh] ${getGridLayout()}`}>
            {/* Left Side - Timing Cards (only when showcaller is playing) */}
            {shouldShowTiming && (
              <div className="col-span-2 flex flex-col justify-center space-y-[1.5vh]">
                {/* Show Elapsed Time */}
                <Card className="bg-gray-900 border-zinc-700 flex-1">
                  <CardContent className="px-[0.8vw] py-[0.8vh] text-center h-full flex flex-col justify-center">
                    <div className={`text-zinc-400 font-semibold tracking-wider ${shouldShowScript ? 'text-[clamp(0.6rem,2.2vh,1.5rem)] mb-[0.3vh]' : 'text-[clamp(0.7rem,3vh,2rem)] mb-[0.5vh]'}`}>SHOW ELAPSED</div>
                    <div className={`font-mono font-bold text-blue-400 flex items-center justify-center leading-none ${shouldShowScript ? 'text-[clamp(1.2rem,4.5vh,3rem)]' : 'text-[clamp(1.5rem,6vh,4rem)]'}`}>
                      {showElapsedTime}
                    </div>
                  </CardContent>
                </Card>

                {/* Show Remaining Time */}
                <Card className="bg-gray-900 border-zinc-700 flex-1">
                  <CardContent className="px-[0.8vw] py-[0.8vh] text-center h-full flex flex-col justify-center">
                    <div className={`text-zinc-400 font-semibold tracking-wider ${shouldShowScript ? 'text-[clamp(0.6rem,2.2vh,1.5rem)] mb-[0.3vh]' : 'text-[clamp(0.7rem,3vh,2rem)] mb-[0.5vh]'}`}>SHOW REMAINING</div>
                    <div className={`font-mono font-bold text-orange-400 flex items-center justify-center leading-none ${shouldShowScript ? 'text-[clamp(1.2rem,4.5vh,3rem)]' : 'text-[clamp(1.5rem,6vh,4rem)]'}`}>
                      {showRemainingTime}
                    </div>
                  </CardContent>
                </Card>

                {/* Current Item Elapsed */}
                <Card className="bg-gray-900 border-zinc-700 flex-1">
                  <CardContent className="px-[0.8vw] py-[0.8vh] text-center h-full flex flex-col justify-center">
                    <div className={`text-zinc-400 font-semibold tracking-wider ${shouldShowScript ? 'text-[clamp(0.6rem,2.2vh,1.5rem)] mb-[0.3vh]' : 'text-[clamp(0.7rem,3vh,2rem)] mb-[0.5vh]'}`}>ITEM ELAPSED</div>
                    <div className={`font-mono font-bold text-green-400 flex items-center justify-center leading-none ${shouldShowScript ? 'text-[clamp(1.2rem,4.5vh,3rem)]' : 'text-[clamp(1.5rem,6vh,4rem)]'}`}>
                      {currentItemElapsed}
                    </div>
                  </CardContent>
                </Card>

                {/* Current Item Time Remaining */}
                <Card className="bg-gray-900 border-zinc-700 flex-1">
                  <CardContent className="px-[0.8vw] py-[0.8vh] text-center h-full flex flex-col justify-center">
                    <div className={`text-zinc-400 font-semibold tracking-wider ${shouldShowScript ? 'text-[clamp(0.6rem,2.2vh,1.5rem)] mb-[0.3vh]' : 'text-[clamp(0.7rem,3vh,2rem)] mb-[0.5vh]'}`}>ITEM REMAINING</div>
                    <div className={`font-mono font-bold text-yellow-400 flex items-center justify-center leading-none ${shouldShowScript ? 'text-[clamp(1.2rem,4.5vh,3rem)]' : 'text-[clamp(1.5rem,6vh,4rem)]'}`}>
                      {formatTimeRemaining(timeRemaining)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Center - Current Header Banner and Segments Display */}
            <div className="col-span-6 flex flex-col space-y-[0.5vh]">
              {/* Current Header Section Banner */}
              {currentHeaderInfo.name && (
                <div className="bg-gray-700 border border-zinc-600 rounded-lg px-[1vw] py-[0.3vh]">
                  <div className="text-[clamp(1rem,1.4vw,2rem)] font-medium text-zinc-200">
                    {currentHeaderInfo.name}
                  </div>
                </div>
              )}

              {/* Segments Display - with dynamic sizing */}
              <div ref={segmentsContainerRef} className="flex-1 flex flex-col justify-center space-y-[0.3vh]">
                {/* Hidden measurement row for calculating row heights */}
                <div ref={measureRowRef} className="bg-gray-900 border border-zinc-600 rounded-lg p-[0.3vw] opacity-0 absolute pointer-events-none">
                  <div className="flex items-center space-x-[1vw]">
                    <div className="w-[4vw] text-center">
                      <div className="text-[clamp(0.7rem,0.9vw,1.2rem)] text-zinc-400 font-semibold">MEAS</div>
                      <div className="text-[clamp(0.9rem,1.3vw,1.8rem)] font-mono text-zinc-300">00</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[clamp(1.1rem,1.6vw,2.2rem)] font-semibold text-zinc-300">Measurement Row</div>
                      {selectedColumns.map(columnKey => {
                        const columnName = availableColumns.find(col => col.key === columnKey)?.name || columnKey;
                        return (
                          <div key={columnKey} className="text-[clamp(0.7rem,1vw,1.3rem)] text-gray-400 mt-[0.1vh]">
                            <span className="font-semibold">{columnName}:</span> Sample Content
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Previous Segment 1 */}
                <div 
                  className="border border-zinc-600 rounded-lg p-[0.3vw] opacity-60"
                  style={{
                    backgroundColor: hasCustomColor(prev1Info.color) ? prev1Info.color : 'rgb(17, 24, 39)'
                  }}
                >
                  <div className="flex items-center space-x-[1vw]">
                    <div className="w-[4vw] text-center">
                      <div className="text-[clamp(0.7rem,0.9vw,1.2rem)] text-zinc-400 font-semibold">PREV</div>
                      <div className="text-[clamp(0.9rem,1.3vw,1.8rem)] font-mono text-zinc-300">{prev1Info.rowNumber}</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[clamp(1.1rem,1.6vw,2.2rem)] font-semibold text-zinc-300">{prev1Info.name}</div>
                      {renderColumnData(prev1Info.columnData)}
                    </div>
                  </div>
                </div>

                {/* Current Segment with Arrow Indicator */}
                <div className="flex items-center gap-[0.5vw]">
                  {/* Arrow indicator */}
                  <div className="flex-shrink-0">
                    <Play className="w-[2.5vw] h-[2.5vw] text-blue-400 fill-blue-400" />
                  </div>
                  
                  {/* Current segment card */}
                  <div 
                    className="flex-1 border-2 border-white rounded-lg p-[0.5vw] shadow-lg"
                    style={{
                      backgroundColor: hasCustomColor(currInfo.color) ? currInfo.color : 'rgb(17, 24, 39)'
                    }}
                  >
                    <div className="flex items-center space-x-[1vw]">
                      <div className="w-[4vw] text-center">
                        <div className="text-[clamp(1rem,1.2vw,1.8rem)] text-green-400 font-bold">LIVE</div>
                        <div className="text-[clamp(1.2rem,1.8vw,2.5rem)] font-mono font-bold text-white">{currInfo.rowNumber}</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-[clamp(1.4rem,2.2vw,3rem)] font-bold text-white mb-[0.3vh]">{currInfo.name}</div>
                        <div className="mt-[0.3vh]">
                          {selectedColumns.map(columnKey => {
                            const columnName = availableColumns.find(col => col.key === columnKey)?.name || columnKey;
                            const value = currInfo.columnData[columnKey] || '--';
                            
                            return (
                              <div key={columnKey} className="text-[clamp(0.9rem,1.3vw,1.8rem)] text-zinc-200 mt-[0.2vh]">
                                <span className="font-semibold">{columnName}:</span> {value}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic Next Segments */}
                {nextSegmentInfos.map((nextInfo, index) => (
                  <div 
                    key={index} 
                    className={`border border-zinc-600 rounded-lg p-[0.3vw] ${
                      index === 0 ? 'opacity-80' : 
                      index === 1 ? 'opacity-60' : 
                      'opacity-40'
                    }`}
                    style={{
                      backgroundColor: hasCustomColor(nextInfo.color) ? nextInfo.color : 'rgb(17, 24, 39)'
                    }}
                  >
                    <div className="flex items-center space-x-[1vw]">
                      <div className="w-[4vw] text-center">
                        <div className={`text-[clamp(0.7rem,0.9vw,1.2rem)] font-semibold ${
                          index === 0 ? 'text-zinc-400' : 'text-zinc-500'
                        }`}>NEXT</div>
                        <div className={`font-mono ${
                          index === 0 ? 'text-[clamp(0.9rem,1.3vw,1.8rem)] text-zinc-300' : 
                          'text-[clamp(0.8rem,1.1vw,1.5rem)] text-zinc-400'
                        }`}>{nextInfo.rowNumber}</div>
                      </div>
                      <div className="flex-1">
                        <div className={`font-semibold ${
                          index === 0 ? 'text-[clamp(1.1rem,1.6vw,2.2rem)] text-zinc-300' : 
                          'text-[clamp(1rem,1.4vw,2rem)] text-zinc-400'
                        }`}>{nextInfo.name}</div>
                        {renderColumnData(nextInfo.columnData)}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Column Controls */}
                <div className="flex items-center justify-between mt-[0.3vh] pt-[0.3vh] border-t border-zinc-700">
                  <div className="flex items-center space-x-[0.3vw]">
                    <div className="text-[clamp(0.7rem,0.9vw,1.2rem)] text-zinc-400 font-semibold">Additional Columns:</div>
                    {selectedColumns.map(columnKey => {
                      const columnName = availableColumns.find(col => col.key === columnKey)?.name || columnKey;
                      return (
                        <div key={columnKey} className="flex items-center bg-zinc-700 rounded px-[0.4vw] py-[0.1vh] text-[clamp(0.6rem,0.8vw,1rem)]">
                          <span>{columnName}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-[0.2vw] h-[1vw] w-[1vw] p-0 text-zinc-400 hover:text-white"
                            onClick={() => removeColumn(columnKey)}
                          >
                            <X className="h-[0.6vw] w-[0.6vw]" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="flex items-center space-x-[0.5vw]">
                    {availableUnselectedColumns.length > 0 && (
                      <div className="relative">
                        {!showColumnSelector ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowColumnSelector(true)}
                            className="bg-gray-800 border-zinc-600 text-white hover:text-white hover:bg-zinc-700 text-[clamp(0.6rem,0.8vw,1rem)] px-[0.6vw] py-[0.2vh]"
                          >
                            <Plus className="h-[0.8vw] w-[0.8vw] mr-[0.2vw]" />
                            Add Column
                          </Button>
                        ) : (
                          <Select onValueChange={addColumn} onOpenChange={(open) => !open && setShowColumnSelector(false)}>
                            <SelectTrigger className="w-[12vw] bg-gray-900 border-zinc-600 text-white text-[clamp(0.6rem,0.8vw,1rem)]">
                              <SelectValue placeholder="Select column..." />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-zinc-600">
                              {availableUnselectedColumns.map(column => (
                                <SelectItem 
                                  key={column.key} 
                                  value={column.key}
                                  className="text-white hover:bg-zinc-700 focus:bg-zinc-700 text-[clamp(0.6rem,0.8vw,1rem)]"
                                >
                                  {column.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )}
                    
                    {/* Script Toggle Button - only show if there's meaningful script content */}
                    {currentSegment && hasScriptContent(currentSegment.script) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowScript(!showScript)}
                        className="bg-gray-800 border-zinc-600 text-white hover:text-white hover:bg-zinc-700 text-[clamp(0.6rem,0.8vw,1rem)] px-[0.6vw] py-[0.2vh]"
                      >
                        {showScript ? <EyeOff className="h-[0.8vw] w-[0.8vw] mr-[0.2vw]" /> : <Eye className="h-[0.8vw] w-[0.8vw] mr-[0.2vw]" />}
                        {showScript ? 'Hide Script' : 'Show Script'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Script (conditionally rendered only when there's meaningful content) */}
            {shouldShowScript && (
              <div className="col-span-4 flex flex-col h-full">
                <Card className="bg-gray-900 border-zinc-700 flex-1 flex flex-col">
                  <CardContent className="p-[0.3vw] flex-1 flex flex-col">
                    <div className="text-[clamp(0.6rem,0.8vw,1.1rem)] text-zinc-400 mb-[0.3vh] font-semibold">CURRENT SCRIPT</div>
                    <div 
                      ref={scriptContainerRef}
                      className="flex-1 bg-black rounded-lg p-[0.5vw] overflow-hidden min-h-0"
                      style={{ height: 'calc(100% - 2rem)' }}
                    >
                      <div 
                        ref={scriptContentRef}
                        className="text-white whitespace-pre-wrap leading-relaxed break-words h-full w-full overflow-hidden"
                        style={{ 
                          fontSize: scriptFontSize,
                          lineHeight: '1.4'
                        }}
                      >
                        {renderScriptWithBrackets(currentSegment.script)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ADView;
