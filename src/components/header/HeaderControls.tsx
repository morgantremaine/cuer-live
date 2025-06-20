
import React, { useState } from 'react';
import { User, LogOut, HelpCircle, Search } from 'lucide-react';
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
import SearchAndReplaceMenu from '../search/SearchAndReplaceMenu';
import { useAuth } from '@/hooks/useAuth';
import { RundownItem } from '@/hooks/useRundownItems';

interface HeaderControlsProps {
  currentTime: Date;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  // Search functionality props
  items?: RundownItem[];
  onUpdateItem?: (id: string, field: string, value: string) => void;
}

const HeaderControls = ({
  currentTime,
  timezone,
  onTimezoneChange,
  onUndo,
  canUndo,
  lastAction,
  items = [],
  onUpdateItem = () => {}
}: HeaderControlsProps) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSearchMenu, setShowSearchMenu] = useState(false);
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

  // Handle global keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearchMenu(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex items-center space-x-4">
      <span className="text-lg font-mono">{formatTime(currentTime, timezone)}</span>
      <TimezoneSelector 
        currentTimezone={timezone}
        onTimezoneChange={handleTimezoneChange}
      />
      
      {/* Search Icon */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSearchMenu(!showSearchMenu)}
          className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Search & Replace (Ctrl+F)"
        >
          <Search className="h-4 w-4" />
        </Button>
        
        <SearchAndReplaceMenu
          items={items}
          onUpdateItem={onUpdateItem}
          isOpen={showSearchMenu}
          onClose={() => setShowSearchMenu(false)}
        />
      </div>

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
