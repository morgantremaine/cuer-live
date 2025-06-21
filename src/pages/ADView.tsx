
import React, { useState, useEffect, useRef } from 'react';
import { useSharedRundownState } from '@/hooks/useSharedRundownState';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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

  // Calculate show elapsed time
  const showElapsedTime = (() => {
    if (!rundownData?.startTime) return '00:00:00';
    
    const startTime = new Date();
    const [hours, minutes, seconds] = rundownData.startTime.split(':').map(Number);
    startTime.setHours(hours, minutes, seconds || 0, 0);
    
    const now = new Date();
    const elapsed = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 1000));
    
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  })();

  // Calculate timing status
  const timingStatus = (() => {
    if (!currentSegment || !rundownData?.items) return { status: 'on-time', difference: '00:00' };
    
    // This is a simplified calculation - in a real implementation you'd want more sophisticated timing logic
    const elapsedSeconds = showElapsedTime.split(':').reduce((acc, time, index) => {
      return acc + (parseInt(time) * Math.pow(60, 2 - index));
    }, 0);
    
    // Calculate expected elapsed time based on rundown
    let expectedElapsed = 0;
    for (let i = 0; i < currentIndex; i++) {
      const item = rundownData.items[i];
      if (item.duration && item.type !== 'header') {
        const [mins, secs] = item.duration.split(':').map(Number);
        expectedElapsed += (mins * 60) + (secs || 0);
      }
    }
    
    const difference = Math.abs(elapsedSeconds - expectedElapsed);
    const isAhead = elapsedSeconds < expectedElapsed;
    const isOnTime = difference <= 30; // Within 30 seconds is "on time"
    
    const diffMins = Math.floor(difference / 60);
    const diffSecs = difference % 60;
    const diffString = `${diffMins.toString().padStart(2, '0')}:${diffSecs.toString().padStart(2, '0')}`;
    
    return {
      status: isOnTime ? 'on-time' : (isAhead ? 'ahead' : 'behind'),
      difference: diffString
    };
  })();

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
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">{rundownData.title}</h1>
            <div className="text-xl text-gray-300">AD View</div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Time Information */}
            <div className="space-y-6">
              {/* Current Time */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6 text-center">
                  <div className="text-sm text-gray-400 mb-2">TIME OF DAY</div>
                  <div className="text-3xl font-mono font-bold">
                    {currentTime.toLocaleTimeString()}
                  </div>
                </CardContent>
              </Card>

              {/* Show Elapsed Time */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6 text-center">
                  <div className="text-sm text-gray-400 mb-2">SHOW ELAPSED</div>
                  <div className="text-3xl font-mono font-bold text-blue-400">
                    {showElapsedTime}
                  </div>
                </CardContent>
              </Card>

              {/* Current Item Time Remaining */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6 text-center">
                  <div className="text-sm text-gray-400 mb-2">TIME REMAINING</div>
                  <div className="text-3xl font-mono font-bold text-yellow-400">
                    {formatTimeRemaining(timeRemaining)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Center Column - Segments */}
            <div className="space-y-6">
              {/* Previous Segment */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6 text-center">
                  <div className="text-sm text-gray-400 mb-2">PREVIOUS</div>
                  <div className="text-xl font-semibold text-gray-300">
                    {previousSegment?.name || '--'}
                  </div>
                </CardContent>
              </Card>

              {/* Current Segment */}
              <Card className="bg-green-900 border-green-700">
                <CardContent className="p-6 text-center">
                  <div className="text-sm text-green-300 mb-2">CURRENT</div>
                  <div className="text-2xl font-bold text-green-100">
                    {currentSegment?.name || '--'}
                  </div>
                </CardContent>
              </Card>

              {/* Next Segment */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6 text-center">
                  <div className="text-sm text-gray-400 mb-2">NEXT</div>
                  <div className="text-xl font-semibold text-gray-300">
                    {nextSegment?.name || '--'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Status & Tools */}
            <div className="space-y-6">
              {/* Timing Status */}
              <Card className={`border-2 ${
                timingStatus.status === 'on-time' ? 'bg-green-900 border-green-600' :
                timingStatus.status === 'ahead' ? 'bg-yellow-900 border-yellow-600' :
                'bg-red-900 border-red-600'
              }`}>
                <CardContent className="p-6 text-center">
                  <div className="text-sm text-gray-300 mb-2">TIMING</div>
                  <div className={`text-2xl font-bold ${
                    timingStatus.status === 'on-time' ? 'text-green-200' :
                    timingStatus.status === 'ahead' ? 'text-yellow-200' :
                    'text-red-200'
                  }`}>
                    {timingStatus.status === 'on-time' ? 'ON TIME' :
                     timingStatus.status === 'ahead' ? `AHEAD ${timingStatus.difference}` :
                     `BEHIND ${timingStatus.difference}`}
                  </div>
                </CardContent>
              </Card>

              {/* Stopwatch */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                  <div className="text-sm text-gray-400 mb-4 text-center">STOPWATCH</div>
                  <div className="text-2xl font-mono font-bold text-center mb-4">
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
