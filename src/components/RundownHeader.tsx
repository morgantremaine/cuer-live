
import React, { useState } from 'react';
import { Play, Clock, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RundownHeaderProps {
  currentTime: Date;
}

const RundownHeader = ({ currentTime }: RundownHeaderProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState('Live Broadcast Rundown');

  const formatTime = (time: Date) => {
    return time.toLocaleTimeString('en-US', { hour12: false });
  };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
    }
  };

  return (
    <div className="bg-blue-600 dark:bg-blue-700 text-white p-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <Play className="h-6 w-6" />
        {isEditingTitle ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={handleKeyDown}
            className="text-xl font-bold bg-transparent border-b-2 border-white outline-none text-white placeholder-white"
            autoFocus
          />
        ) : (
          <div className="flex items-center space-x-2 group">
            <h1 className="text-xl font-bold">{title}</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingTitle(true)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      <div className="flex items-center space-x-4">
        <Clock className="h-5 w-5" />
        <span className="text-lg font-mono">{formatTime(currentTime)}</span>
      </div>
    </div>
  );
};

export default RundownHeader;
