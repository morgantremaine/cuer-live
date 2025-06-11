
import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExpandableCellProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxHeight?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const ExpandableCell = ({
  value,
  onChange,
  placeholder = "Enter text...",
  maxHeight = "120px",
  isExpanded = false,
  onToggleExpand
}: ExpandableCellProps) => {
  const [localExpanded, setLocalExpanded] = useState(false);
  
  // Use controlled expansion if provided, otherwise use local state
  const expanded = onToggleExpand ? isExpanded : localExpanded;
  const toggleExpanded = onToggleExpand || (() => setLocalExpanded(!localExpanded));

  // Show expand button only if there's content or it's already expanded
  const showExpandButton = value.length > 50 || expanded;

  return (
    <div className="relative w-full">
      <div className="flex items-start gap-1">
        {showExpandButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded();
            }}
            className="p-1 h-6 w-6 mt-1 shrink-0"
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        )}
        
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`
            w-full resize-none border-0 bg-transparent p-1 text-sm
            focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
            transition-all duration-200 ease-in-out
            ${expanded ? `min-h-[80px] max-h-[${maxHeight}]` : 'h-6 overflow-hidden'}
          `}
          style={{
            height: expanded ? 'auto' : '24px',
            maxHeight: expanded ? maxHeight : '24px'
          }}
          rows={expanded ? 4 : 1}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      
      {/* Truncated preview when collapsed and there's content */}
      {!expanded && value.length > 50 && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="truncate text-sm text-gray-600 pt-1 pl-1">
            {value.substring(0, 50)}...
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpandableCell;
