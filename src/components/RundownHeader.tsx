import React, { useState } from 'react';
import { Clock, Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import TimezoneSelector from './TimezoneSelector';

interface RundownHeaderProps {
  currentTime: Date;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  totalRuntime: string;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onManualSave: () => void;
  title: string;
  onTitleChange: (title: string) => void;
}

const RundownHeader = ({ 
  currentTime, 
  timezone, 
  onTimezoneChange, 
  totalRuntime,
  hasUnsavedChanges,
  isSaving,
  onManualSave,
  title,
  onTitleChange
}: RundownHeaderProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const navigate = useNavigate();

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleTitleClick = () => {
    setTempTitle(title);
    setIsEditingTitle(true);
  };

  const handleTitleSubmit = () => {
    onTitleChange(tempTitle.trim() || 'Untitled Rundown');
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setTempTitle(title);
      setIsEditingTitle(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    });
  };

  const getSaveStatusText = () => {
    if (isSaving) return 'Saving...';
    if (hasUnsavedChanges) return 'Unsaved changes';
    return 'All changes saved';
  };

  const getSaveStatusColor = () => {
    if (isSaving) return 'text-blue-600';
    if (hasUnsavedChanges) return 'text-amber-600';
    return 'text-green-600';
  };

  return (
    <div className="p-4 border-b bg-gray-100 dark:bg-gray-900">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button
            onClick={handleBackToDashboard}
            variant="ghost"
            size="sm"
            className="flex items-center space-x-1"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Dashboard</span>
          </Button>
          
          {isEditingTitle ? (
            <input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={handleTitleKeyDown}
              className="text-2xl font-bold bg-transparent border-b-2 border-blue-500 focus:outline-none min-w-[200px]"
              autoFocus
            />
          ) : (
            <h1 
              className="text-2xl font-bold cursor-pointer hover:text-blue-600 transition-colors"
              onClick={handleTitleClick}
              title="Click to edit title"
            >
              {title}
            </h1>
          )}
          
          {/* Save Status Indicator */}
          <div className="flex items-center space-x-2">
            <div className={`text-sm ${getSaveStatusColor()}`}>
              {getSaveStatusText()}
            </div>
            {(hasUnsavedChanges || isSaving) && (
              <Button
                onClick={onManualSave}
                disabled={isSaving}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1"
              >
                <Save className={`h-4 w-4 ${isSaving ? 'animate-spin' : ''}`} />
                <span>{isSaving ? 'Saving...' : 'Save Now'}</span>
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
            <Clock className="h-4 w-4" />
            <span className="font-mono">{formatTime(currentTime)}</span>
            <TimezoneSelector currentTimezone={timezone} onTimezoneChange={onTimezoneChange} />
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Total Runtime: <span className="font-mono font-bold">{totalRuntime}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RundownHeader;
