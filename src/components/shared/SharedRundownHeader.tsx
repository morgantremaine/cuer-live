
import React from 'react';
import { Clock, Users, Calendar, Play } from 'lucide-react';
import { useClockFormat } from '@/hooks/useClockFormat';

interface SharedRundownHeaderProps {
  title: string;
  startTime: string;
  timezone: string;
  layoutName?: string;
  currentSegmentId?: string | null;
  isPlaying?: boolean;
  timeRemaining?: number;
}

export const SharedRundownHeader: React.FC<SharedRundownHeaderProps> = ({
  title,
  startTime,
  timezone,
  layoutName,
  currentSegmentId,
  isPlaying,
  timeRemaining
}) => {
  const { formatTime } = useClockFormat();

  // Format countdown timer
  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {title}
          </h1>
          <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Start: {formatTime(startTime)}
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {timezone}
            </div>
          </div>
        </div>
        <div className="text-right flex items-center space-x-4">
          {/* Showcaller Timer - Small and subtle like the original */}
          {currentSegmentId && isPlaying && timeRemaining !== undefined && timeRemaining >= 0 && (
            <div className="flex items-center space-x-2 print:hidden">
              <div className="bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-2 py-1 rounded font-mono text-xs border min-w-[50px] text-center">
                {formatCountdown(timeRemaining)}
              </div>
              <div className="flex items-center space-x-1">
                <Play className="h-3 w-3 text-blue-500 fill-blue-500" />
                <span className="text-xs text-blue-500 font-medium">LIVE</span>
              </div>
            </div>
          )}
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Shared Rundown
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              Read-only view
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
