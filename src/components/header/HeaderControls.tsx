
import React, { useState } from 'react';
import { User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TimezoneSelector from '../TimezoneSelector';
import AuthModal from '../AuthModal';
import SearchBar from '../SearchBar';
import { useAuth } from '@/hooks/useAuth';

interface HeaderControlsProps {
  currentTime: Date;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  items: any[];
  visibleColumns: any[];
  onHighlightMatch: (itemId: string, field: string, startIndex: number, endIndex: number) => void;
  onReplaceText: (itemId: string, field: string, searchText: string, replaceText: string, replaceAll: boolean) => void;
}

const HeaderControls = ({
  currentTime,
  timezone,
  onTimezoneChange,
  items,
  visibleColumns,
  onHighlightMatch,
  onReplaceText
}: HeaderControlsProps) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, signOut } = useAuth();

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

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex items-center space-x-4">
      <span className="text-lg font-mono">{formatTime(currentTime, timezone)}</span>
      <TimezoneSelector 
        currentTimezone={timezone}
        onTimezoneChange={onTimezoneChange}
      />
      <div className="relative">
        <SearchBar
          items={items}
          visibleColumns={visibleColumns}
          onHighlightMatch={onHighlightMatch}
          onReplaceText={onReplaceText}
        />
      </div>
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
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
};

export default HeaderControls;
