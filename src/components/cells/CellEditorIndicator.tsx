import React from 'react';

interface CellEditorIndicatorProps {
  userName: string;
  userId: string;
  itemId: string;
  children: React.ReactNode;
}

// Generate consistent color for a user based on their ID
const getUserColor = (userId: string): string => {
  const colors = [
    'outline-blue-400 ring-blue-400/20',
    'outline-green-400 ring-green-400/20',
    'outline-purple-400 ring-purple-400/20',
    'outline-amber-400 ring-amber-400/20',
    'outline-pink-400 ring-pink-400/20',
  ];
  
  // Simple hash function to get consistent color per user
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Generate badge background color
const getBadgeColor = (userId: string): string => {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-amber-500',
    'bg-pink-500',
  ];
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Visual indicator that wraps a cell to show when another user is actively editing it
 * Displays a colored border and a floating badge with the user's name
 */
export const CellEditorIndicator: React.FC<CellEditorIndicatorProps> = ({
  userName,
  userId,
  itemId,
  children
}) => {
  const borderColor = getUserColor(userId);
  const badgeColor = getBadgeColor(userId);

  return (
    <div className={`relative outline outline-2 ${borderColor} ring-2 rounded-sm`}>
      {/* Floating user badge */}
      <div className="absolute -top-2.5 -right-2 z-50">
        <div className={`${badgeColor} text-white text-xs px-2 py-0.5 rounded-full shadow-md whitespace-nowrap`}>
          {userName}
        </div>
      </div>
      
      {/* Cell content */}
      {children}
    </div>
  );
};
