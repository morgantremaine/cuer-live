
import React from 'react';
import { Clock } from 'lucide-react';

interface ShowcallerTimingIndicatorProps {
  isOnTime: boolean;
  isAhead: boolean;
  timeDifference: string;
  isVisible: boolean;
  size?: 'default' | 'compact';
}

const ShowcallerTimingIndicator = ({
  isOnTime,
  isAhead,
  timeDifference,
  isVisible,
  size = 'default'
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

  const isCompact = size === 'compact';

  return (
    <div className={`flex items-center transition-all duration-200 ${statusColor} ${bgColor} border-current/20 ${
      isCompact 
        ? 'space-x-1 px-1.5 py-0.5 rounded border text-xs' 
        : 'space-x-1.5 px-2.5 py-1 rounded-lg border'
    }`}>
      <Clock className={isCompact ? "h-3 w-3" : "h-4 w-4"} />
      <span className={`font-mono font-bold tabular-nums ${
        isCompact ? 'text-xs' : 'text-lg'
      }`}>
        {statusText}
      </span>
    </div>
  );
};

export default ShowcallerTimingIndicator;
