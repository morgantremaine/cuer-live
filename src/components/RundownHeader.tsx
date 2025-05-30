
import React, { useState } from 'react';
import { Play, Edit2, User, LogOut, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import TimezoneSelector from './TimezoneSelector';
import AuthModal from './AuthModal';
import { useAuth } from '@/hooks/useAuth';

interface RundownHeaderProps {
  currentTime: Date;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  totalRuntime: string;
}

const RundownHeader = ({ 
  currentTime, 
  timezone, 
  onTimezoneChange, 
  totalRuntime
}: RundownHeaderProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState('Live Broadcast Rundown');
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

  return (
    <div className="bg-blue-600 dark:bg-blue-700 text-white p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToDashboard}
            className="text-white hover:bg-blue-700 dark:hover:bg-blue-600 p-2"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
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
          <span className="text-lg font-mono">{formatTime(currentTime, timezone)}</span>
          <TimezoneSelector 
            currentTimezone={timezone}
            onTimezoneChange={onTimezoneChange}
          />
          {user ? (
            <div className="flex items-center space-x-2">
              <span className="text-sm">{user.email}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-white hover:bg-blue-700 dark:hover:bg-blue-600"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAuthModal(true)}
              className="text-white hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              <User className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          )}
        </div>
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="opacity-75">Total Runtime: {totalRuntime}</span>
        <span className="opacity-75">{timezone.replace('_', ' ')}</span>
      </div>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
};

export default RundownHeader;
