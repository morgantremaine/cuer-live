import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TextDiffDisplayProps {
  fieldName: string;
  oldValue: string;
  newValue: string;
  defaultCollapsed?: boolean;
}

const TextDiffDisplay = ({ 
  fieldName, 
  oldValue, 
  newValue, 
  defaultCollapsed = true 
}: TextDiffDisplayProps) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  
  // Calculate character difference
  const oldLength = oldValue?.length || 0;
  const newLength = newValue?.length || 0;
  const charDiff = newLength - oldLength;
  const charDiffText = charDiff > 0 
    ? `+${charDiff} chars` 
    : charDiff < 0 
    ? `${charDiff} chars` 
    : 'no change in length';

  return (
    <div className="ml-2 text-xs">
      <Button
        variant="ghost"
        size="sm"
        className="h-auto p-0 text-xs font-mono text-primary hover:bg-transparent flex items-center gap-1"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        <span>{fieldName} changed</span>
        {isCollapsed && (
          <span className="text-muted-foreground ml-1">({charDiffText})</span>
        )}
      </Button>
      
      {!isCollapsed && (
        <div className="mt-2 space-y-2">
          {/* Previous value */}
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Previous
            </div>
            <div className="bg-red-500/5 border border-red-500/20 rounded p-2 max-h-32 overflow-y-auto">
              <div className="text-xs text-foreground whitespace-pre-wrap break-words font-mono">
                {oldValue || '(empty)'}
              </div>
            </div>
          </div>
          
          {/* Updated value */}
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-2">
              <span>Updated</span>
              <span className="text-[10px] font-normal">({charDiffText})</span>
            </div>
            <div className="bg-green-500/5 border border-green-500/20 rounded p-2 max-h-32 overflow-y-auto">
              <div className="text-xs text-foreground whitespace-pre-wrap break-words font-mono">
                {newValue || '(empty)'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextDiffDisplay;
