
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
    statusColor = 'text-green-600 dark:text-green-400';
    bgColor = 'bg-green-50 dark:bg-green-900/20';
  } else if (isAhead) {
    statusText = `Under -${timeDifference}`;
    statusColor = 'text-yellow-600 dark:text-yellow-400';
    bgColor = 'bg-yellow-50 dark:bg-yellow-900/20';
  } else {
    statusText = `Over +${timeDifference}`;
    statusColor = 'text-red-600 dark:text-red-400';
    bgColor = 'bg-red-50 dark:bg-red-900/20';
  }

  return (
    <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-all duration-200 ${statusColor} ${bgColor} border-current/20`}>
      <Clock className="h-4 w-4" />
      <span className="text-lg font-mono font-bold tabular-nums">
        {statusText}
      </span>
    </div>
  );
};

export default ShowcallerTimingIndicator;
