
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
    <div className="relative">
      {/* Background lines */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Green line - 600px wide from left */}
        <div className="absolute top-1/2 left-0 w-[600px] h-0.5 bg-green-500 transform -translate-y-1/2"></div>
        {/* Grey line - 300px wide from left */}
        <div className="absolute top-1/2 left-0 w-[300px] h-0.5 bg-gray-400 transform -translate-y-1/2"></div>
      </div>
      
      {/* Main indicator with blue shadow */}
      <div className={`flex items-center space-x-2 animate-fade-in ${statusColor} px-4 py-2 relative z-10`}
           style={{ 
             filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))',
             textShadow: '0 0 8px rgba(59, 130, 246, 0.3)'
           }}>
        <Clock className="h-5 w-5" />
        <span className="text-xl font-mono font-bold">
          {statusText}
        </span>
      </div>
    </div>
  );
};

export default ShowcallerTimingIndicator;
