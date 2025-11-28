import React from 'react';

interface CellEditorIndicatorProps {
  userName?: string;
  userId?: string;
  itemId: string;
  isActive: boolean;
  children: React.ReactNode;
}

// Generate consistent color for a user based on their ID (hex value)
const getUserColorHex = (userId: string): string => {
  const colors = [
    '#60a5fa', // blue-400
    '#4ade80', // green-400
    '#a78bfa', // purple-400
    '#fbbf24', // amber-400
    '#f472b6', // pink-400
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
  isActive,
  children
}) => {
  // Only compute colors if active
  const borderColorHex = isActive && userId ? getUserColorHex(userId) : 'transparent';
  const badgeColor = isActive && userId ? getBadgeColor(userId) : '';

  return (
    <div 
      className="relative rounded-sm"
      style={{ boxShadow: isActive ? `inset 0 0 0 2px ${borderColorHex}` : 'none' }}
    >
      {/* Only render badge when active */}
      {isActive && userName && (
        <div className="absolute -top-2.5 -right-2 z-50">
          <div className={`${badgeColor} text-white text-xs px-2 py-0.5 rounded-full shadow-md whitespace-nowrap`}>
            {userName}
          </div>
        </div>
      )}
      
      {/* Cell content */}
      {children}
    </div>
  );
};
