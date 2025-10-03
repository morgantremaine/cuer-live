import React, { useState } from 'react';
import { User, LogOut, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNavigate } from 'react-router-dom'
import TimezoneSelector from '../TimezoneSelector';
import AuthModal from '../AuthModal';
import { useAuth } from '@/hooks/useAuth';
import { useClockFormat } from '@/contexts/ClockFormatContext';

interface HeaderControlsProps {
  currentTime: Date;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
}

const HeaderControls = ({
  currentTime,
  timezone,
  onTimezoneChange,
  onUndo,
  canUndo,
  lastAction
}: HeaderControlsProps) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { formatTime: formatClockTime, clockFormat } = useClockFormat();

  const formatTime = (time: Date, tz: string) => {
    try {
      // Map Las Vegas to Los Angeles timezone for display
      const actualTimezone = tz === 'America/Las_Vegas' ? 'America/Los_Angeles' : tz;
      const timeString = time.toLocaleTimeString('en-US', { 
        hour12: clockFormat === '12',
        timeZone: actualTimezone
      });
      return timeString;
    } catch {
      return time.toLocaleTimeString('en-US', { hour12: clockFormat === '12' });
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleHelpClick = () => {
    window.open('/help', '_blank');
  };

  const handleTimezoneChange = (newTimezone: string) => {
    console.log('🌍 HeaderControls: Timezone change requested:', { from: timezone, to: newTimezone });
    // Call the parent handler directly - this should trigger the enhanced setter
    onTimezoneChange(newTimezone);
  };

  return (
    <div className="flex items-center space-x-4">
      <span className="text-lg font-mono">{formatTime(currentTime, timezone)}</span>
      <TimezoneSelector 
        currentTimezone={timezone}
        onTimezoneChange={handleTimezoneChange}
      />
      {/* Search functionality removed */}
      {/* Undo button intentionally removed from header - functionality remains in toolbar */}
      {user ? (
        <div className="flex items-center space-x-2 relative">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-gray-900 dark:text-white hover:text-gray-100 hover:bg-transparent">
                <User className="h-4 w-4 mr-2" />
                {user.email}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 z-50">
              <DropdownMenuItem 
                onClick={() => navigate('/account')}
                className="text-gray-900 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              >
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleHelpClick}
                className="text-gray-900 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Help
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleSignOut}
                className="text-gray-900 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
};

export default HeaderControls;
