
import React, { useState, useEffect, useMemo } from 'react';
import { useSharedRundownState } from '@/hooks/useSharedRundownState';
import { useShowcallerTiming } from '@/hooks/useShowcallerTiming';
import { Clock, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getRowNumber } from '@/utils/sharedRundownUtils';
import { timeToSeconds, secondsToTime, calculateItemsWithTiming } from '@/utils/rundownCalculations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ADView = () => {
  const { rundownData, currentTime, currentSegmentId, loading, error, timeRemaining } = useSharedRundownState();
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  // Check if showcaller is playing
  const isShowcallerPlaying = !!rundownData?.showcallerState?.playbackStartTime;

  // Use the same timing hook as the main rundown
  const timingStatus = useShowcallerTiming({
    items: rundownData?.items || [],
    rundownStartTime: rundownData?.startTime || '',
    isPlaying: isShowcallerPlaying,
    currentSegmentId: currentSegmentId || '',
    timeRemaining: timeRemaining || 0
  });

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
  
  // Get previous 2 and next 2 segments (non-header items only)
  const previousSegments = currentTimedIndex >= 0 ? [
    currentTimedIndex >= 2 ? timedItems[currentTimedIndex - 2] : null,
    currentTimedIndex >= 1 ? timedItems[currentTimedIndex - 1] : null
  ] : [null, null];
  
  const nextSegments = currentTimedIndex >= 0 ? [
    currentTimedIndex < timedItems.length - 1 ? timedItems[currentTimedIndex + 1] : null,
    currentTimedIndex < timedItems.length - 2 ? timedItems[currentTimedIndex + 2] : null
  ] : [null, null];

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

  // Calculate current item elapsed time
  const currentItemElapsed = (() => {
    if (!currentSegment?.duration || !rundownData?.showcallerState?.playbackStartTime) {
      return '00:00';
    }
    
    const durationParts = currentSegment.duration.split(':').map(Number);
    let totalSeconds = 0;
    
    if (durationParts.length === 2) {
      totalSeconds = durationParts[0] * 60 + durationParts[1];
    } else if (durationParts.length === 3) {
      totalSeconds = durationParts[0] * 3600 + durationParts[1] * 60 + durationParts[2];
    }
    
    const elapsed = Math.floor((Date.now() - rundownData.showcallerState.playbackStartTime) / 1000);
    const itemElapsed = Math.min(elapsed, totalSeconds);
    
    // Format as MM:SS instead of HH:MM:SS
    const mins = Math.floor(itemElapsed / 60);
    const secs = itemElapsed % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  })();

  // Get segment display info with row numbers and additional column data (removed color)
  const getSegmentInfo = (segment: any) => {
    if (!segment || !rundownData?.items) return { 
      name: '--', 
      rowNumber: '', 
      columnData: {} 
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
    
    return { name, rowNumber, columnData };
  };

  // Get info for all segments
  const prev2Info = previousSegments[0] ? getSegmentInfo(previousSegments[0]) : { name: '--', rowNumber: '', columnData: {} };
  const prev1Info = previousSegments[1] ? getSegmentInfo(previousSegments[1]) : { name: '--', rowNumber: '', columnData: {} };
  const currInfo = currentSegment ? getSegmentInfo(currentSegment) : { name: '--', rowNumber: '', columnData: {} };
  const next1Info = nextSegments[0] ? getSegmentInfo(nextSegments[0]) : { name: '--', rowNumber: '', columnData: {} };
  const next2Info = nextSegments[1] ? getSegmentInfo(nextSegments[1]) : { name: '--', rowNumber: '', columnData: {} };

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

  // Calculate dynamic height for script area based on content length
  const getScriptHeight = () => {
    const scriptText = currentSegment?.script || '';
    const textLength = scriptText.length;
    
    // Base height + additional height based on content
    const baseHeight = 400; // increased minimum height
    const additionalHeight = Math.floor(textLength / 80) * 40; // 40px per ~80 characters (more responsive)
    const maxHeight = 1000; // increased maximum height
    
    return Math.min(baseHeight + additionalHeight, maxHeight);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    );
  }

  if (error || !rundownData) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl text-red-400 mb-2">Error loading rundown</div>
          <div className="text-lg text-gray-400">{error || 'Rundown not found'}</div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallbackTitle="AD View Error">
      <div className="min-h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
        {/* Header - Using CSS Grid for stable layout */}
        <div className="bg-gray-800 border-b border-gray-700 px-7 py-5">
          <div className="grid grid-cols-[1fr_3fr_1fr] gap-4 items-center">
            {/* Left Column - Timing Status */}
            <div className="flex justify-start">
              <div className="text-center min-w-[280px]">
                <div className="text-sm text-gray-400 mb-1 font-semibold">TIMING STATUS</div>
                <div className={`text-2xl font-bold font-mono min-h-[1.75rem] flex items-center justify-center truncate ${
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
            
            {/* Center Column - Logo and Title (Even Wider) */}
            <div className="flex items-center justify-center">
              <div className="flex items-center space-x-5">
                <img 
                  src="/lovable-uploads/9bfd48af-1719-4d02-9dee-8af16d6c8322.png"
                  alt="Cuer Logo" 
                  className="h-9 w-auto flex-shrink-0"
                />
                <div className="text-3xl font-bold text-white text-center leading-tight">
                  {rundownData.title}
                </div>
              </div>
            </div>
            
            {/* Right Column - Time of Day */}
            <div className="flex justify-end">
              <div className="text-center min-w-[280px]">
                <div className="text-sm text-gray-400 mb-1 font-semibold">TIME OF DAY</div>
                <div className="text-4xl font-mono font-bold text-blue-400">
                  {currentTime.toLocaleTimeString('en-GB', { hour12: false })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Updated grid layout with wider timing and script areas */}
        <div className="flex-1 px-0 py-0">
          <div className="grid grid-cols-12 gap-5 h-full p-5">
            {/* Left Side - Timing Cards - Increased to 3 columns */}
            <div className="col-span-3 space-y-4">
              {/* Show Elapsed Time */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-5 text-center">
                  <div className="text-sm text-gray-400 mb-2 font-semibold">SHOW ELAPSED</div>
                  <div className="text-3xl font-mono font-bold text-blue-400">
                    {showElapsedTime}
                  </div>
                </CardContent>
              </Card>

              {/* Show Remaining Time */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-5 text-center">
                  <div className="text-sm text-gray-400 mb-2 font-semibold">SHOW REMAINING</div>
                  <div className="text-3xl font-mono font-bold text-orange-400">
                    {showRemainingTime}
                  </div>
                </CardContent>
              </Card>

              {/* Extra spacing before Item Elapsed */}
              <div className="h-4"></div>

              {/* Current Item Elapsed */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-5 text-center">
                  <div className="text-sm text-gray-400 mb-2 font-semibold">ITEM ELAPSED</div>
                  <div className="text-3xl font-mono font-bold text-green-400">
                    {currentItemElapsed}
                  </div>
                </CardContent>
              </Card>

              {/* Current Item Time Remaining */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-5 text-center">
                  <div className="text-sm text-gray-400 mb-2 font-semibold">ITEM REMAINING</div>
                  <div className="text-3xl font-mono font-bold text-yellow-400">
                    {formatTimeRemaining(timeRemaining)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Center - Segments Display - Reduced to 6 columns to accommodate wider sides */}
            <div className="col-span-6 flex flex-col justify-center space-y-4">
              {/* Previous Segment 2 */}
              <div 
                className="bg-gray-800 border border-gray-600 rounded-lg p-4 opacity-40"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-14 text-center">
                    <div className="text-xs text-gray-500 font-semibold">PREV</div>
                    <div className="text-sm font-mono text-gray-400">{prev2Info.rowNumber}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-medium text-gray-400">{prev2Info.name}</div>
                    {renderColumnData(prev2Info.columnData)}
                  </div>
                </div>
              </div>

              {/* Previous Segment 1 */}
              <div 
                className="bg-gray-800 border border-gray-600 rounded-lg p-4 opacity-60"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-14 text-center">
                    <div className="text-xs text-gray-400 font-semibold">PREV</div>
                    <div className="text-base font-mono text-gray-300">{prev1Info.rowNumber}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-gray-300">{prev1Info.name}</div>
                    {renderColumnData(prev1Info.columnData)}
                  </div>
                </div>
              </div>

              {/* Current Segment - Increased size */}
              <div 
                className="bg-green-900 border-2 border-green-600 rounded-lg p-6 shadow-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-14 text-center">
                    <div className="text-sm text-green-300 font-bold">ON AIR</div>
                    <div className="text-xl font-mono font-bold text-green-100">{currInfo.rowNumber}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-green-100 mb-2">{currInfo.name}</div>
                    <div className="mt-2">
                      {selectedColumns.map(columnKey => {
                        const columnName = availableColumns.find(col => col.key === columnKey)?.name || columnKey;
                        const value = currInfo.columnData[columnKey] || '--';
                        
                        return (
                          <div key={columnKey} className="text-base text-green-200 mt-1">
                            <span className="font-semibold">{columnName}:</span> {value}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Segment 1 */}
              <div 
                className="bg-gray-800 border border-gray-600 rounded-lg p-4 opacity-80"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-14 text-center">
                    <div className="text-xs text-gray-400 font-semibold">NEXT</div>
                    <div className="text-base font-mono text-gray-300">{next1Info.rowNumber}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-gray-300">{next1Info.name}</div>
                    {renderColumnData(next1Info.columnData)}
                  </div>
                </div>
              </div>

              {/* Next Segment 2 */}
              <div 
                className="bg-gray-800 border border-gray-600 rounded-lg p-4 opacity-60"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-14 text-center">
                    <div className="text-xs text-gray-500 font-semibold">NEXT</div>
                    <div className="text-sm font-mono text-gray-400">{next2Info.rowNumber}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-medium text-gray-400">{next2Info.name}</div>
                    {renderColumnData(next2Info.columnData)}
                  </div>
                </div>
              </div>

              {/* Column Controls - Increased spacing */}
              <div className="flex items-center justify-between mt-5 pt-5 border-t border-gray-700">
                <div className="flex items-center space-x-2">
                  <div className="text-sm text-gray-400 font-semibold">Additional Columns:</div>
                  {selectedColumns.map(columnKey => {
                    const columnName = availableColumns.find(col => col.key === columnKey)?.name || columnKey;
                    return (
                      <div key={columnKey} className="flex items-center bg-gray-700 rounded px-3 py-1 text-sm">
                        <span>{columnName}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-1 h-4 w-4 p-0 text-gray-400 hover:text-white"
                          onClick={() => removeColumn(columnKey)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
                
                {availableUnselectedColumns.length > 0 && (
                  <div className="relative">
                    {!showColumnSelector ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowColumnSelector(true)}
                        className="border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Column
                      </Button>
                    ) : (
                      <Select onValueChange={addColumn} onOpenChange={(open) => !open && setShowColumnSelector(false)}>
                        <SelectTrigger className="w-44 bg-gray-800 border-gray-600 text-white">
                          <SelectValue placeholder="Select column..." />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          {availableUnselectedColumns.map(column => (
                            <SelectItem 
                              key={column.key} 
                              value={column.key}
                              className="text-white hover:bg-gray-700 focus:bg-gray-700"
                            >
                              {column.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Script - Increased to 3 columns to match timing blocks */}
            <div className="col-span-3">
              <Card className="bg-gray-800 border-gray-700" style={{ height: `${getScriptHeight()}px` }}>
                <CardContent className="p-5 h-full flex flex-col">
                  <div className="text-sm text-gray-400 mb-4 font-semibold">CURRENT SCRIPT</div>
                  <div className="flex-1 bg-gray-900 rounded-lg p-5 overflow-y-auto">
                    <div className="text-white whitespace-pre-wrap text-base leading-relaxed break-words">
                      {currentSegment?.script || 'No script available for current segment'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ADView;
