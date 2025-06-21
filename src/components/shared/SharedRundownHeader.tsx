
import React from 'react';
import { Clock, Palette, Sun, Moon, Play, Pause, MapPin, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

interface SharedRundownHeaderProps {
  title: string;
  startTime: string;
  timezone: string;
  layoutName: string;
  currentSegmentId: string | null;
  isPlaying: boolean;
  timeRemaining: string;
  isDark: boolean;
  onToggleTheme: () => void;
  autoScrollEnabled?: boolean;
  onToggleAutoScroll?: () => void;
  items?: any[]; // Add items prop for runtime calculation
}

export const SharedRundownHeader = ({
  title,
  startTime,
  timezone,
  layoutName,
  currentSegmentId,
  isPlaying,
  timeRemaining,
  isDark,
  onToggleTheme,
  autoScrollEnabled = false,
  onToggleAutoScroll,
  items = []
}: SharedRundownHeaderProps) => {
  // Calculate total runtime (excluding floated items)
  const calculateTotalRuntime = () => {
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

    const totalSeconds = items.reduce((acc, item) => {
      // Skip floated items - they don't count towards runtime
      if (item.isFloating || item.isFloated) {
        return acc;
      }
      return acc + timeToSeconds(item.duration || '00:00');
    }, 0);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  };

  const totalRuntime = calculateTotalRuntime();

  return (
    <div className={`${isDark ? 'bg-gray-900' : 'bg-white'} print:bg-white`}>
      <div className="px-4 py-3 print:px-2 print:py-2">
        <div className="flex flex-col space-y-3 print:space-y-2">
          {/* Title and Controls Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 print:space-x-2">
              {/* Logo - smaller in print view */}
              <img 
                src="/lovable-uploads/c651349b-4259-451e-8648-9e8a329145c6.png"
                alt="Cuer Logo" 
                className="h-8 w-auto print:h-5 hidden print:block"
              />
              <img 
                src={isDark ? "/lovable-uploads/9bfd48af-1719-4d02-9dee-8af16d6c8322.png" : "/lovable-uploads/afeee545-0420-4bb9-a4c1-cc3e2931ec3e.png"}
                alt="Cuer Logo" 
                className="h-8 w-auto print:hidden"
              />
              <div>
                <h1 className={`text-xl font-bold print:text-lg print:text-black ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  {title}
                </h1>
                {/* Hide the read-only notice in print */}
                <p className={`text-sm print:hidden ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  This is a read-only view of the rundown. Updates appear live.
                </p>
              </div>
            </div>
            
            {/* Hide all interactive controls in print */}
            <div className="flex items-center space-x-2 print:hidden">
              {/* Autoscroll Toggle */}
              {onToggleAutoScroll && (
                <div className={`flex items-center space-x-1.5 px-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground ${
                  isDark ? 'border-gray-600' : 'border-gray-300'
                } h-9`}>
                  <MapPin className={`h-3.5 w-3.5 transition-colors ${autoScrollEnabled ? 'text-blue-500' : 'text-gray-400'}`} />
                  <Switch
                    checked={autoScrollEnabled}
                    onCheckedChange={onToggleAutoScroll}
                    className="scale-75"
                  />
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className={`${
                  isDark 
                    ? 'border-gray-600 hover:bg-gray-700' 
                    : 'border-gray-300 hover:bg-gray-100'
                }`}
              >
                <Printer className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleTheme}
                className={`${
                  isDark 
                    ? 'border-gray-600 hover:bg-gray-700' 
                    : 'border-gray-300 hover:bg-gray-100'
                }`}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Essential Information Row - visible in print */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 print:flex-row print:justify-between print:space-y-0">
            <div className="flex items-center space-x-4 text-sm print:text-xs print:text-black">
              <div className={`flex items-center space-x-1 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              } print:text-black`}>
                <Play className="h-4 w-4 print:h-3 print:w-3" />
                <span>Start: {startTime}</span>
              </div>
              <div className={`flex items-center space-x-1 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              } print:text-black`}>
                <Clock className="h-4 w-4 print:h-3 print:w-3" />
                <span>Runtime: {totalRuntime}</span>
              </div>
              <div className={`flex items-center space-x-1 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              } print:text-black`}>
                <span>Timezone: {timezone}</span>
              </div>
            </div>
            
            {/* Playback Status - hide in print */}
            <div className="flex items-center space-x-3 print:hidden">
              {isPlaying && (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <Play className="h-4 w-4 text-green-500 fill-green-500" />
                    <span className={`text-sm font-medium ${
                      isDark ? 'text-green-400' : 'text-green-600'
                    }`}>
                      Live
                    </span>
                  </div>
                  {timeRemaining && (
                    <span className={`text-sm font-mono px-2 py-1 rounded ${
                      isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {timeRemaining}
                    </span>
                  )}
                </div>
              )}
              
              {!isPlaying && (
                <div className="flex items-center space-x-1">
                  <Pause className="h-4 w-4 text-gray-400" />
                  <span className={`text-sm ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Paused
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
