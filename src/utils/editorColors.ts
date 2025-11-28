/**
 * Utility functions for generating consistent colors for active cell editors
 */

export const getUserColorHex = (userId: string): string => {
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

export const getBadgeBgClass = (userId: string): string => {
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
