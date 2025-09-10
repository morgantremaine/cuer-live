import React from 'react';
import { RundownItem } from '@/types/rundown';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeleprompterSidebarProps {
  items: (RundownItem & { originalIndex: number })[];
  getRowNumber: (index: number) => string;
  onItemClick: (itemId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const TeleprompterSidebar = ({
  items,
  getRowNumber,
  onItemClick,
  isCollapsed,
  onToggleCollapse
}: TeleprompterSidebarProps) => {
  const handleItemClick = (itemId: string) => {
    onItemClick(itemId);
  };

  return (
    <div className={cn(
      "bg-background border-r border-border transition-all duration-300 flex flex-col h-screen",
      isCollapsed ? "w-12" : "w-80"
    )}>
      {/* Header */}
      <div className="h-[73px] border-b border-border flex items-center justify-between px-4 flex-shrink-0">
        {!isCollapsed && (
          <h2 className="text-sm font-medium text-foreground">Script Navigation</h2>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-muted rounded-md transition-colors"
        >
          {isCollapsed ? (
            <Menu className="h-4 w-4 text-muted-foreground" />
          ) : (
            <X className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-2 space-y-1">
            {items.map((item) => {
              const rowNumber = getRowNumber(item.originalIndex);
              const isHeader = item.type === 'header';
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-md transition-colors hover:bg-muted group",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    isHeader && "bg-muted/50"
                  )}
                >
                  <div className="flex items-start space-x-3">
                    <span className={cn(
                      "text-xs font-mono shrink-0 mt-0.5",
                      isHeader ? "text-primary font-semibold" : "text-muted-foreground"
                    )}>
                      {rowNumber}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        "text-sm truncate",
                        isHeader ? "font-semibold text-foreground" : "text-foreground"
                      )}>
                        {item.name || 'Untitled'}
                      </p>
                      {item.segmentName && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {item.segmentName}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeleprompterSidebar;