import React from 'react';
import { RundownItem } from '@/types/rundown';
import { ChevronLeft } from 'lucide-react';
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
      "bg-background border-r border-border transition-all duration-300 flex flex-col h-screen relative",
      isCollapsed ? "w-12" : "w-80"
    )}>
      {/* Collapse/Expand Button - Sleek Design */}
      <div 
        className="absolute -right-4 top-1/2 transform -translate-y-1/2 z-10"
      >
        <button
          onClick={onToggleCollapse}
          className="group bg-background/95 backdrop-blur-sm border border-border/50 rounded-full p-2 hover:bg-muted/80 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
        >
          <div className="relative w-4 h-4 flex items-center justify-center">
            <ChevronLeft 
              className={`h-3 w-3 text-muted-foreground group-hover:text-foreground transition-all duration-300 ${
                isCollapsed ? 'rotate-180' : 'rotate-0'
              }`} 
            />
          </div>
        </button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto min-h-0 pt-4">
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