import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getAvatarBgClass, getAvatarRingClass } from '@/utils/editorColors';
import { cn } from '@/lib/utils';

export interface PresenceUser {
  userId: string;
  userFullName: string;
  isEditing: boolean;  // Has cursor in a cell
  lastEditedItemId?: string;
  lastEditedField?: string;
}

interface PresenceAvatarsProps {
  users: PresenceUser[];
  onScrollToUser: (user: PresenceUser) => void;
  maxVisible?: number;
}

const getInitials = (fullName: string): string => {
  const parts = fullName.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const PresenceAvatars = ({ users, onScrollToUser, maxVisible = 3 }: PresenceAvatarsProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  if (users.length === 0) {
    return null;
  }

  const visibleUsers = users.slice(0, maxVisible);
  const overflowUsers = users.slice(maxVisible);
  const hasOverflow = overflowUsers.length > 0;

  const handleAvatarClick = (user: PresenceUser) => {
    if (user.isEditing && user.lastEditedItemId) {
      onScrollToUser(user);
    }
  };

  const renderAvatar = (user: PresenceUser, showTooltip = true) => {
    const initials = getInitials(user.userFullName);
    const bgClass = getAvatarBgClass(user.userId);
    const ringClass = getAvatarRingClass(user.userId);
    const isClickable = user.isEditing && user.lastEditedItemId;

    const avatar = (
      <div
        className={cn(
          'relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 border-white transition-all',
          bgClass,
          user.isEditing && 'ring-2 ring-offset-1 animate-pulse',
          user.isEditing && ringClass,
          isClickable && 'cursor-pointer hover:scale-110'
        )}
      >
        {initials}
        {user.isEditing && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center">
            <Pencil className="w-2 h-2 text-green-600" />
          </div>
        )}
      </div>
    );

    if (!showTooltip) {
      return (
        <div key={user.userId} onClick={() => handleAvatarClick(user)}>
          {avatar}
        </div>
      );
    }

    return (
      <TooltipProvider key={user.userId}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="focus:outline-none overflow-visible"
              onClick={() => handleAvatarClick(user)}
            >
              {avatar}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{user.userFullName}</p>
            {user.isEditing && <p className="text-xs text-muted-foreground">Currently editing • Click to scroll</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="flex items-center -space-x-2">
      {visibleUsers.map(user => renderAvatar(user))}
      
      {hasOverflow && (
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-white flex items-center justify-center text-xs font-medium cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title={`${overflowUsers.length} more user${overflowUsers.length === 1 ? '' : 's'}`}
            >
              +{overflowUsers.length}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <div className="space-y-2">
              <p className="text-sm font-medium mb-2">All viewers</p>
              {users.map(user => (
                <div
                  key={user.userId}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors',
                    user.isEditing && user.lastEditedItemId && 'cursor-pointer'
                  )}
                  onClick={() => {
                    handleAvatarClick(user);
                    setIsPopoverOpen(false);
                  }}
                >
                  {renderAvatar(user, false)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.userFullName}</p>
                  </div>
                  {user.isEditing && (
                    <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                      Editing
                    </span>
                  )}
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default PresenceAvatars;
