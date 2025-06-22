import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSharedRundownState } from '@/hooks/useSharedRundownState';
import { useShowcallerTiming } from '@/hooks/useShowcallerTiming';
import { Play, Pause, RotateCcw, Clock, Plus, X } from 'lucide-react';
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
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const stopwatchInterval = useRef<NodeJS.Timeout | null>(null);

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

  // Calculate show elapsed time based on current showcaller item start time + playback elapsed
  const showElapsedTime = (() => {
    if (!currentSegment?.startTime || !rundownData?.showcallerState?.playbackStartTime) {
      return '00:00:00';
    }
    
    // Get the current item's start time in seconds from midnight
    const startTimeParts = currentSegment.startTime.split(':').map(Number);
    let startTimeSeconds = 0;
    if (startTimeParts.length === 2) {
      startTimeSeconds = startTimeParts[0] * 60 + startTimeParts[1];
    } else if (startTimeParts.length === 3) {
      startTimeSeconds = startTimeParts[0] * 3600 + startTimeParts[1] * 60 + startTimeParts[2];
    }
    
    // Calculate how long showcaller has been running on this item
    const playbackElapsed = Math.floor((Date.now() - rundownData.showcallerState.playbackStartTime) / 1000);
    
    // Add the playback elapsed to the start time
    const currentShowTime = startTimeSeconds + playbackElapsed;
    
    return secondsToTime(currentShowTime);
  })();

  // Calculate show remaining time - time until the last item ends
  const showRemainingTime = (() => {
    if (!calculatedItems.length || !rundownData?.startTime) {
      return '00:00:00';
    }

    // Find the last non-header item with a calculated end time
    const lastItem = [...calculatedItems].reverse().find(item => 
      item.type !== 'header' && item.calculatedEndTime
    );

    if (!lastItem?.calculatedEndTime) {
      return '00:00:00';
    }

    // Get current show elapsed time in seconds
    const showElapsedSeconds = timeToSeconds(showElapsedTime);
    
    // Get last item end time in seconds
    const lastItemEndSeconds = timeToSeconds(lastItem.calculatedEndTime);
    
    // Calculate remaining time
    const remainingSeconds = Math.max(0, lastItemEndSeconds - showElapsedSeconds);
    
    return secondsToTime(remainingSeconds);
  })();

  // Calculate current item elapsed time
  const currentItemElapsed = (() => {
    if (!currentSegment?.duration || !rundownData?.showcallerState?.playbackStartTime) {
      return '00:00:00';
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
    
    return secondsToTime(itemElapsed);
  })();

  // Get segment display info with row numbers, colors, and additional column data
  const getSegmentInfo = (segment: any) => {
    if (!segment || !rundownData?.items) return { 
      name: '--', 
      rowNumber: '', 
      color: '', 
      columnData: {} 
    };
    
    // Find the original index in the full items array (including headers)
    const originalIndex = rundownData.items.findIndex(item => item.id === segment.id);
    const rowNumber = getRowNumber(originalIndex, rundownData.items);
    const name = segment.name || segment.segmentName || '--';
    const color = segment.color || '';
    
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
    
    return { name, rowNumber, color, columnData };
  };

  // Get info for all segments
  const prev2Info = previousSegments[0] ? getSegmentInfo(previousSegments[0]) : { name: '--', rowNumber: '', color: '', columnData: {} };
  const prev1Info = previousSegments[1] ? getSegmentInfo(previousSegments[1]) : { name: '--', rowNumber: '', color: '', columnData: {} };
  const currInfo = currentSegment ? getSegmentInfo(currentSegment) : { name: '--', rowNumber: '', color: '', columnData: {} };
  const next1Info = nextSegments[0] ? getSegmentInfo(nextSegments[0]) : { name: '--', rowNumber: '', color: '', columnData: {} };
  const next2Info = nextSegments[1] ? getSegmentInfo(nextSegments[1]) : { name: '--', rowNumber: '', color: '', columnData: {} };

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
        <div key={columnKey} className="text-xs text-gray-400 mt-1">
          <span className="font-semibold">{columnName}:</span> {value}
        </div>
      );
    });
  };

  // Stopwatch controls
  const startStopwatch = () => {
    setStopwatchRunning(true);
    stopwatchInterval.current = setInterval(() => {
      setStopwatchSeconds(prev => prev + 1);
    }, 1000);
  };

  const pauseStopwatch = () => {
    setStopwatchRunning(false);
    if (stopwatchInterval.current) {
      clearInterval(stopwatchInterval.current);
      stopwatchInterval.current = null;
    }
  };

  const resetStopwatch = () => {
    setStopwatchSeconds(0);
    setStopwatchRunning(false);
    if (stopwatchInterval.current) {
      clearInterval(stopwatchInterval.current);
      stopwatchInterval.current = null;
    }
  };

  // Format stopwatch time
  const formatStopwatchTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Format time remaining
  const formatTimeRemaining = (seconds: number | null) => {
    if (seconds === null || seconds === undefined) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stopwatchInterval.current) {
        clearInterval(stopwatchInterval.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !rundownData) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-400 mb-2">Error loading rundown</div>
          <div className="text-sm text-gray-400">{error || 'Rundown not found'}</div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallbackTitle="AD View Error">
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        {/* Top Priority Section - Time of Day */}
        <div className="bg-gray-800 border-b border-gray-700 p-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">TIME OF DAY</div>
              <div className="text-4xl font-mono font-bold text-blue-400">
                {currentTime.toLocaleTimeString('en-GB', { hour12: false })}
              </div>
            </div>
            <div className="flex items-center justify-start flex-1 ml-16">
              <div className="flex items-center space-x-4">
                <img 
                  src="/lovable-uploads/9bfd48af-1719-4d02-9dee-8af16d6c8322.png"
                  alt="Cuer Logo" 
                  className="h-8 w-auto"
                />
                <div className="text-2xl font-bold text-white">{rundownData.title}</div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">TIMING STATUS</div>
              <div className={`text-2xl font-bold ${
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
        </div>

        {/* Main Content */}
        <div className="flex-1 max-w-7xl mx-auto p-8 w-full">
          <div className="grid grid-cols-12 gap-8 h-full">
            {/* Left Side - Timing and Stopwatch */}
            <div className="col-span-2 space-y-6">
              {/* Show Elapsed Time */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4 text-center">
                  <div className="text-xs text-gray-400 mb-2">SHOW ELAPSED</div>
                  <div className="text-xl font-mono font-bold text-blue-400">
                    {showElapsedTime}
                  </div>
                </CardContent>
              </Card>

              {/* Show Remaining Time */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4 text-center">
                  <div className="text-xs text-gray-400 mb-2">SHOW REMAINING</div>
                  <div className="text-xl font-mono font-bold text-orange-400">
                    {showRemainingTime}
                  </div>
                </CardContent>
              </Card>

              {/* Current Item Elapsed */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4 text-center">
                  <div className="text-xs text-gray-400 mb-2">ITEM ELAPSED</div>
                  <div className="text-xl font-mono font-bold text-green-400">
                    {currentItemElapsed}
                  </div>
                </CardContent>
              </Card>

              {/* Current Item Time Remaining */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4 text-center">
                  <div className="text-xs text-gray-400 mb-2">ITEM TIME REMAINING</div>
                  <div className="text-xl font-mono font-bold text-yellow-400">
                    {formatTimeRemaining(timeRemaining)}
                  </div>
                </CardContent>
              </Card>

              {/* Stopwatch */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="text-xs text-gray-400 mb-3 text-center">STOPWATCH</div>
                  <div className="text-2xl font-mono font-bold text-center mb-4 text-white">
                    {formatStopwatchTime(stopwatchSeconds)}
                  </div>
                  <div className="flex justify-center space-x-2">
                    {!stopwatchRunning ? (
                      <Button onClick={startStopwatch} className="bg-green-600 hover:bg-green-700" size="sm">
                        <Play className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button onClick={pauseStopwatch} className="bg-yellow-600 hover:bg-yellow-700" size="sm">
                        <Pause className="h-4 w-4" />
                      </Button>
                    )}
                    <Button onClick={resetStopwatch} variant="outline" className="border-gray-600" size="sm">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Center - Segments Display */}
            <div className="col-span-7 flex flex-col justify-center space-y-3">
              {/* Previous Segment 2 */}
              <div 
                className="bg-gray-800 border border-gray-600 rounded-lg p-3 opacity-40"
                style={{ backgroundColor: prev2Info.color ? `${prev2Info.color}15` : undefined }}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 text-center">
                    <div className="text-xs text-gray-500">PREV</div>
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
                className="bg-gray-800 border border-gray-600 rounded-lg p-3 opacity-60"
                style={{ backgroundColor: prev1Info.color ? `${prev1Info.color}20` : undefined }}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 text-center">
                    <div className="text-xs text-gray-400">PREV</div>
                    <div className="text-sm font-mono text-gray-300">{prev1Info.rowNumber}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-gray-300">{prev1Info.name}</div>
                    {renderColumnData(prev1Info.columnData)}
                  </div>
                </div>
              </div>

              {/* Current Segment */}
              <div 
                className="bg-green-900 border-2 border-green-600 rounded-lg p-6 shadow-lg"
                style={{ backgroundColor: currInfo.color ? `${currInfo.color}40` : undefined }}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 text-center">
                    <div className="text-xs text-green-300">ON AIR</div>
                    <div className="text-lg font-mono font-bold text-green-100">{currInfo.rowNumber}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-green-100">{currInfo.name}</div>
                    <div className="mt-2">
                      {selectedColumns.map(columnKey => {
                        const columnName = availableColumns.find(col => col.key === columnKey)?.name || columnKey;
                        const value = currInfo.columnData[columnKey] || '--';
                        
                        return (
                          <div key={columnKey} className="text-sm text-green-200 mt-1">
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
                className="bg-gray-800 border border-gray-600 rounded-lg p-3 opacity-80"
                style={{ backgroundColor: next1Info.color ? `${next1Info.color}20` : undefined }}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 text-center">
                    <div className="text-xs text-gray-400">NEXT</div>
                    <div className="text-sm font-mono text-gray-300">{next1Info.rowNumber}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-gray-300">{next1Info.name}</div>
                    {renderColumnData(next1Info.columnData)}
                  </div>
                </div>
              </div>

              {/* Next Segment 2 */}
              <div 
                className="bg-gray-800 border border-gray-600 rounded-lg p-3 opacity-60"
                style={{ backgroundColor: next2Info.color ? `${next2Info.color}15` : undefined }}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 text-center">
                    <div className="text-xs text-gray-500">NEXT</div>
                    <div className="text-sm font-mono text-gray-400">{next2Info.rowNumber}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-medium text-gray-400">{next2Info.name}</div>
                    {renderColumnData(next2Info.columnData)}
                  </div>
                </div>
              </div>

              {/* Column Controls - Moved to bottom */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
                <div className="flex items-center space-x-2">
                  <div className="text-sm text-gray-400">Additional Columns:</div>
                  {selectedColumns.map(columnKey => {
                    const columnName = availableColumns.find(col => col.key === columnKey)?.name || columnKey;
                    return (
                      <div key={columnKey} className="flex items-center bg-gray-700 rounded px-2 py-1 text-xs">
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
                        <SelectTrigger className="w-48 bg-gray-800 border-gray-600 text-white">
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

            {/* Right Side - Script */}
            <div className="col-span-3">
              <Card className="bg-gray-800 border-gray-700 h-full">
                <CardContent className="p-4 h-full flex flex-col">
                  <div className="text-xs text-gray-400 mb-3">CURRENT SCRIPT</div>
                  <div className="flex-1 bg-gray-900 rounded-lg p-4 overflow-y-auto">
                    <div className="text-white whitespace-pre-wrap text-sm leading-relaxed">
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
