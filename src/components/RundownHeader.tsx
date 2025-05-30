
import React from 'react';
import { Play, Clock } from 'lucide-react';

interface RundownHeaderProps {
  currentTime: Date;
}

const RundownHeader = ({ currentTime }: RundownHeaderProps) => {
  const formatTime = (time: Date) => {
    return time.toLocaleTimeString('en-US', { hour12: false });
  };

  return (
    <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <Play className="h-6 w-6" />
        <h1 className="text-xl font-bold">Live Broadcast Rundown</h1>
      </div>
      <div className="flex items-center space-x-4">
        <Clock className="h-5 w-5" />
        <span className="text-lg font-mono">{formatTime(currentTime)}</span>
      </div>
    </div>
  );
};

export default RundownHeader;
