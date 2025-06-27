
import React from 'react';
import { Clock } from 'lucide-react';

interface ShowcallerTimingIndicatorProps {
  isOnTime: boolean;
  isAhead: boolean;
  timeDifference: string;
  isVisible: boolean;
}

const ShowcallerTimingIndicator = ({
  isOnTime,
  isAhead,
  timeDifference,
  isVisible
}: ShowcallerTimingIndicatorProps) => {
  if (!isVisible) return null;

  let statusText: string;
  let statusColor: string;
  let bgColor: string;

  if (isOnTime) {
    statusText = 'ON TIME';
    statusColor = 'text-green-800 dark:text-green-200';
    bgColor = 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700';
  } else if (isAhead) {
    statusText = `UNDER ${timeDifference}`;
    statusColor = 'text-yellow-800 dark:text-yellow-200';
    bgColor = 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700';
  } else {
    statusText = `OVER ${timeDifference}`;
    statusColor = 'text-red-800 dark:text-red-200';
    bgColor = 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700';
  }

  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-md border ${bgColor} animate-fade-in`}>
      <Clock className="h-4 w-4" />
      <span className={`text-sm font-mono font-bold ${statusColor}`}>
        {statusText}
      </span>
    </div>
  );
};

export default ShowcallerTimingIndicator;
