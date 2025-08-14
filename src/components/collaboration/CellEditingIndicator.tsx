import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CellEditingIndicatorProps {
  editors: Array<{
    user_id: string;
    full_name: string;
    email: string;
  }>;
  className?: string;
}

const EDITOR_COLORS = [
  'border-blue-400',
  'border-green-400', 
  'border-purple-400',
  'border-orange-400',
  'border-pink-400'
];

export const CellEditingIndicator: React.FC<CellEditingIndicatorProps> = ({ 
  editors, 
  className = '' 
}) => {
  if (editors.length === 0) return null;

  const primaryEditor = editors[0];
  const colorClass = EDITOR_COLORS[0]; // For now, use first color
  
  const tooltipText = editors.length === 1 
    ? `${primaryEditor.full_name} is editing...`
    : `${primaryEditor.full_name} and ${editors.length - 1} other${editors.length > 2 ? 's' : ''} are editing...`;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`absolute inset-0 ${colorClass} border-2 rounded pointer-events-none z-10 ${className}`}>
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-current rounded-full animate-pulse"></div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-48">
          <p className="text-xs">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};