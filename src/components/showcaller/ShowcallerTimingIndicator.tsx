
import React from 'react';
import { Clock } from 'lucide-react';

interface ShowcallerTimingIndicatorProps {
  isAhead: boolean;
  timeDifference: string;
  isVisible: boolean;
}

const ShowcallerTimingIndicator = ({
  isAhead,
  timeDifference,
  isVisible
}: ShowcallerTimingIndicatorProps) => {
  if (!isVisible) return null;

  const statusText = isAhead ? `Under -${timeDifference}` : `Over +${timeDifference}`;
  const statusColor = isAhead ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className={`flex items-center space-x-2 animate-fade-in ${statusColor}`}>
      <Clock className="h-4 w-4" />
      <span className="text-sm font-mono font-medium">
        {statusText}
      </span>
    </div>
  );
};

export default ShowcallerTimingIndicator;
