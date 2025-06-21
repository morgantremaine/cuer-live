
import React, { useState, useEffect, useRef } from 'react';
import { useSharedRundownState } from '@/hooks/useSharedRundownState';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getRowNumber } from '@/utils/sharedRundownUtils';
import { timeToSeconds, secondsToTime } from '@/utils/rundownCalculations';

const ADView = () => {
  const { rundownData, currentTime, currentSegmentId, loading, error, timeRemaining } = useSharedRundownState();
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const stopwatchInterval = useRef<NodeJS.Timeout | null>(null);

  // Find current, previous, and next segments
  const currentSegment = rundownData?.items?.find(item => item.id === currentSegmentId);
  const currentIndex = rundownData?.items?.findIndex(item => item.id === currentSegmentId) ?? -1;
  const previousSegment = currentIndex > 0 ? rundownData?.items?.[currentIndex - 1] : null;
  const nextSegment = currentIndex >= 0 && currentIndex < (rundownData?.items?.length ?? 0) - 1 
    ? rundownData?.items?.[currentIndex + 1] 
    : null;

  // Calculate show elapsed time based on showcaller state
  const showElapsedTime = (() => {
    if (!rundownData?.showcallerState?.playbackStartTime || !rundownData?.startTime) {
      return '00:00:00';
    }
    
    const elapsed = Math.floor((Date.now() - rundownData.showcallerState.playbackStartTime) / 1000);
    return secondsToTime(elapsed);
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

  // Calculate timing status
  const timingStatus = (() => {
    if (!rundownData?.showcallerState?.playbackStartTime || !rundownData?.startTime) {
      return { status: 'on-time', difference: '00:00' };
    }
    
    // Calculate actual elapsed time
    const actualElapsed = Math.floor((Date.now() - rundownData.showcallerState.playbackStartTime) / 1000);
    
    // Calculate expected elapsed time based on rundown
    let expectedElapsed = 0;
    for (let i = 0; i < currentIndex; i++) {
      const item = rundownData.items[i];
      if (item.duration && item.type !== 'header') {
        const [mins, secs] = item.duration.split(':').map(Number);
        expectedElapsed += (mins * 60) + (secs || 0);
      }
    }
    
    const difference = Math.abs(actualElapsed - expectedElapsed);
    const isAhead = actualElapsed < expectedElapsed;
    const isOnTime = difference <= 30; // Within 30 seconds is "on time"
    
    const diffMins = Math.floor(difference / 60);
    const diffSecs = difference % 60;
    const diffString = `${diffMins.toString().padStart(2, '0')}:${diffSecs.toString().padStart(2, '0')}`;
    
    return {
      status: isOnTime ? 'on-time' : (isAhead ? 'ahead' : 'behind'),
      difference: diffString
    };
  })();

  // Get segment display info with row numbers and colors
  const getSegmentInfo = (segment: any, index: number) => {
    if (!segment || !rundownData?.items) return { name: '--', rowNumber: '', color: '' };
    
    const rowNumber = getRowNumber(index, rundownData.items);
    const name = segment.name || segment.segmentName || '--';
    const color = segment.color || '';
    
    return { name, rowNumber, color };
  };

  const prevInfo = previousSegment ? getSegmentInfo(previousSegment, currentIndex - 1) : { name: '--', rowNumber: '', color: '' };
  const currInfo = currentSegment ? getSegmentInfo(currentSegment, currentIndex) : { name: '--', rowNumber: '', color: '' };
  const nextInfo = nextSegment ? getSegmentInfo(nextSegment, currentIndex + 1) : { name: '--', rowNumber: '', color: '' };

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
        <div className="text-xl">Loading AD View...</div>
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
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Top Priority Section - Time of Day */}
        <div className="bg-gray-800 border-b border-gray-700 p-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">TIME OF DAY</div>
              <div className="text-4xl font-mono font-bold text-blue-400">
                {currentTime.toLocaleTimeString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{rundownData.title}</div>
              <div className="text-sm text-gray-400">AD View</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">TIMING STATUS</div>
              <div className={`text-2xl font-bold ${
                timingStatus.status === 'on-time' ? 'text-green-400' :
                timingStatus.status === 'ahead' ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {timingStatus.status === 'on-time' ? 'ON TIME' :
                 timingStatus.status === 'ahead' ? `AHEAD ${timingStatus.difference}` :
                 `BEHIND ${timingStatus.difference}`}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto p-8">
          <div className="grid grid-cols-12 gap-8">
            {/* Left Side Information */}
            <div className="col-span-3 space-y-6">
              {/* Show Elapsed Time */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4 text-center">
                  <div className="text-xs text-gray-400 mb-2">SHOW ELAPSED</div>
                  <div className="text-2xl font-mono font-bold text-blue-400">
                    {showElapsedTime}
                  </div>
                </CardContent>
              </Card>

              {/* Current Item Elapsed */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4 text-center">
                  <div className="text-xs text-gray-400 mb-2">ITEM ELAPSED</div>
                  <div className="text-2xl font-mono font-bold text-green-400">
                    {currentItemElapsed}
                  </div>
                </CardContent>
              </Card>

              {/* Current Item Time Remaining */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4 text-center">
                  <div className="text-xs text-gray-400 mb-2">TIME REMAINING</div>
                  <div className="text-2xl font-mono font-bold text-yellow-400">
                    {formatTimeRemaining(timeRemaining)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Center - Segments Display */}
            <div className="col-span-6 flex flex-col justify-center space-y-4">
              {/* Previous Segment */}
              <div 
                className="bg-gray-800 border border-gray-600 rounded-lg p-4 opacity-60"
                style={{ backgroundColor: prevInfo.color ? `${prevInfo.color}20` : undefined }}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 text-center">
                    <div className="text-xs text-gray-400">PREV</div>
                    <div className="text-sm font-mono text-gray-300">{prevInfo.rowNumber}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-gray-300">{prevInfo.name}</div>
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
                    <div className="text-xs text-green-300">NOW</div>
                    <div className="text-lg font-mono font-bold text-green-100">{currInfo.rowNumber}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-green-100">{currInfo.name}</div>
                  </div>
                </div>
              </div>

              {/* Next Segment */}
              <div 
                className="bg-gray-800 border border-gray-600 rounded-lg p-4 opacity-80"
                style={{ backgroundColor: nextInfo.color ? `${nextInfo.color}20` : undefined }}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 text-center">
                    <div className="text-xs text-gray-400">NEXT</div>
                    <div className="text-sm font-mono text-gray-300">{nextInfo.rowNumber}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-gray-300">{nextInfo.name}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Stopwatch */}
            <div className="col-span-3">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                  <div className="text-xs text-gray-400 mb-4 text-center">STOPWATCH</div>
                  <div className="text-3xl font-mono font-bold text-center mb-6 text-white">
                    {formatStopwatchTime(stopwatchSeconds)}
                  </div>
                  <div className="flex justify-center space-x-2">
                    {!stopwatchRunning ? (
                      <Button onClick={startStopwatch} className="bg-green-600 hover:bg-green-700">
                        <Play className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button onClick={pauseStopwatch} className="bg-yellow-600 hover:bg-yellow-700">
                        <Pause className="h-4 w-4" />
                      </Button>
                    )}
                    <Button onClick={resetStopwatch} variant="outline" className="border-gray-600">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
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
