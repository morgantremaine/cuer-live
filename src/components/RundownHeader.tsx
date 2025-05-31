
import React, { useState } from 'react';
import { Edit2, User, LogOut, ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import TimezoneSelector from './TimezoneSelector';
import AuthModal from './AuthModal';
import SearchBar from './SearchBar';
import { useAuth } from '@/hooks/useAuth';

interface RundownHeaderProps {
  currentTime: Date;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  totalRuntime: string;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  title: string;
  onTitleChange: (title: string) => void;
  rundownStartTime: string;
  onRundownStartTimeChange: (startTime: string) => void;
  items?: any[];
  visibleColumns?: any[];
  onHighlightMatch?: (itemId: string, field: string, startIndex: number, endIndex: number) => void;
  onReplaceText?: (itemId: string, field: string, searchText: string, replaceText: string, replaceAll: boolean) => void;
}

const RundownHeader = ({ 
  currentTime, 
  timezone, 
  onTimezoneChange, 
  totalRuntime,
  hasUnsavedChanges,
  isSaving,
  title,
  onTitleChange,
  rundownStartTime,
  onRundownStartTimeChange,
  items = [],
  visibleColumns = [],
  onHighlightMatch = () => {},
  onReplaceText = () => {}
}: RundownHeaderProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const formatTime = (time: Date, tz: string) => {
    try {
      const timeString = time.toLocaleTimeString('en-US', { 
        hour12: false,
        timeZone: tz
      });
      return timeString;
    } catch {
      return time.toLocaleTimeString('en-US', { hour12: false });
    }
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

  const handleSignOut = async () => {
    await signOut();
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const getSaveStatus = () => {
    if (isSaving) {
      return <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">Saving...</span>;
    }
    if (hasUnsavedChanges) {
      return <span className="text-xs text-orange-600 dark:text-orange-400 ml-2">Unsaved changes</span>;
    }
    return <span className="text-xs text-green-600 dark:text-green-400 ml-2">Saved</span>;
  };

  return (
    <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToDashboard}
            className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 p-2"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={handleKeyDown}
              className="text-xl font-bold bg-transparent border-b-2 border-gray-400 dark:border-gray-500 outline-none text-gray-900 dark:text-white placeholder-gray-500"
              autoFocus
            />
          ) : (
            <div className="flex items-center space-x-2 group">
              <h1 className="text-xl font-bold">{title}</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingTitle(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              {getSaveStatus()}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-lg font-mono">{formatTime(currentTime, timezone)}</span>
          <TimezoneSelector 
            currentTimezone={timezone}
            onTimezoneChange={onTimezoneChange}
          />
          {user ? (
            <div className="flex items-center space-x-2 relative">
              <span className="text-sm">{user.email}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAuthModal(true)}
              className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <User className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          )}
        </div>
      </div>
      
      {/* Search bar positioned under the user menu */}
      <div className="flex justify-end mb-2">
        <div className="relative">
          <SearchBar
            items={items}
            visibleColumns={visibleColumns}
            onHighlightMatch={onHighlightMatch}
            onReplaceText={onReplaceText}
          />
        </div>
      </div>

      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center space-x-4">
          <span className="opacity-75">Total Runtime: {totalRuntime}</span>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 opacity-75" />
            <span className="opacity-75">Start Time:</span>
            <input
              type="text"
              value={rundownStartTime}
              onChange={(e) => onRundownStartTimeChange(e.target.value)}
              className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 font-mono text-sm w-24 focus:outline-none focus:border-blue-500"
              placeholder="00:00:00"
            />
          </div>
        </div>
      </div>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
};

export default RundownHeader;
