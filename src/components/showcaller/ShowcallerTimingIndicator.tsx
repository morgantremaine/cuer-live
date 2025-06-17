
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

  if (isOnTime) {
    statusText = 'ON TIME';
    statusColor = 'text-green-600 dark:text-green-400';
  } else if (isAhead) {
    statusText = `Under -${timeDifference}`;
    statusColor = 'text-yellow-600 dark:text-yellow-400';
  } else {
    statusText = `Over +${timeDifference}`;
    statusColor = 'text-red-600 dark:text-red-400';
  }

  return (
    <div className={`flex items-center space-x-2 animate-fade-in ${statusColor}`}>
      <Clock className="h-5 w-5" />
      <span className="text-lg font-mono font-bold">
        {statusText}
      </span>
    </div>
  );
};

export default ShowcallerTimingIndicator;
