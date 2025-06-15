
import React from 'react';
import { Clock, Users, Calendar } from 'lucide-react';
import { useClockFormat } from '@/hooks/useClockFormat';

interface SharedRundownHeaderProps {
  title: string;
  startTime: string;
  timezone: string;
  layoutName?: string;
}

export const SharedRundownHeader: React.FC<SharedRundownHeaderProps> = ({
  title,
  startTime,
  timezone,
  layoutName
}) => {
  const { formatTime } = useClockFormat();

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
            {layoutName && (
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                Layout: {layoutName}
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Shared Rundown
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500">
            Read-only view
          </div>
        </div>
      </div>
    </div>
  );
};
