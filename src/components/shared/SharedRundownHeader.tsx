import React from 'react';
import { Clock, Palette, Sun, Moon, Play, Pause, MapPin, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import CuerLogo from '@/components/common/CuerLogo';
import { handleSharedRundownPrint } from '@/utils/sharedRundownPrint';

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
    <div className={`${isDark ? 'bg-gray-900' : 'bg-gray-200'}`}>
      <div className="px-4 py-3 print:px-4 print:py-4">
        <div className="flex flex-col space-y-3 print:space-y-4">
          {/* Title and Controls Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <CuerLogo 
                className="h-8 w-auto print:h-12 print:block hidden"
                isDark={true}
              />
              <CuerLogo 
                className="h-8 w-auto print:hidden"
                isDark={isDark}
              />
              <div>
                <h1 className={`text-xl font-bold print:text-3xl print:font-bold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  {title}
                </h1>
                <p className={`text-sm print:text-xs print:hidden ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  This is a read-only view of the rundown. Updates appear live.
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 print:hidden">
              {/* Autoscroll Toggle */}
              {onToggleAutoScroll && (
                <div className={`flex items-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground ${
                  isDark ? 'border-gray-600' : 'border-gray-300'
                } h-9 overflow-hidden`}>
                  <button
                    onClick={() => {
                      // Scroll to current showcaller position regardless of toggle state
                      const currentSegmentElement = document.querySelector(`[data-item-id="${currentSegmentId}"]`);
                      if (currentSegmentElement) {
                        currentSegmentElement.scrollIntoView({ 
                          behavior: 'smooth', 
                          block: 'center' 
                        });
                      }
                    }}
                    className="flex items-center justify-center px-2 h-full hover:bg-accent hover:text-accent-foreground transition-colors flex-1"
                  >
                    <MapPin className={`h-3.5 w-3.5 transition-colors ${autoScrollEnabled ? 'text-blue-500' : 'text-gray-400'}`} />
                  </button>
                  <div className="border-l border-input">
                    <Switch
                      checked={autoScrollEnabled}
                      onCheckedChange={onToggleAutoScroll}
                      className="scale-75 mx-1"
                    />
                  </div>
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Use the same print logic as the main rundown
                  handleSharedRundownPrint(title, items);
                }}
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

          {/* Status Information Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-4 text-sm print:text-xs print:hidden">
              <div className={`flex items-center space-x-1 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <Play className="h-4 w-4" />
                <span>Start: {startTime}</span>
              </div>
              <div className={`flex items-center space-x-1 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <Clock className="h-4 w-4" />
                <span>TRT: {totalRuntime}</span>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};
