import React, { useState } from 'react';
import { RundownItem } from '@/types/rundown';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

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
  const [searchValue, setSearchValue] = useState('');

  const handleItemClick = (itemId: string) => {
    onItemClick(itemId);
  };

  const handleJumpToItem = (itemNumber: string) => {
    if (!itemNumber.trim()) return;
    
    const searchNumber = parseInt(itemNumber.trim());
    if (isNaN(searchNumber)) return;
    
    // First try to find exact match
    let targetItem = items.find(item => {
      const rowNumber = getRowNumber(item.originalIndex);
      return parseInt(rowNumber) === searchNumber;
    });
    
    // If no exact match, find the nearest item (preferably the highest number below the search)
    if (!targetItem) {
      let bestMatch: typeof items[0] | null = null;
      let closestDistance = Infinity;
      
      items.forEach(item => {
        const rowNumber = getRowNumber(item.originalIndex);
        const itemNum = parseInt(rowNumber);
        if (!isNaN(itemNum)) {
          const distance = Math.abs(itemNum - searchNumber);
          // Prefer items with numbers below the search target
          const isBetter = distance < closestDistance || 
                          (distance === closestDistance && itemNum < searchNumber);
          
          if (isBetter) {
            closestDistance = distance;
            bestMatch = item;
          }
        }
      });
      
      targetItem = bestMatch;
    }
    
    if (targetItem) {
      handleItemClick(targetItem.id);
      setSearchValue(''); // Clear search after jumping
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJumpToItem(searchValue);
    }
  };

  return (
    <div className={cn(
      "bg-background border-r border-border transition-all duration-300 flex flex-col h-screen relative overflow-hidden",
      isCollapsed ? "w-12" : "w-80"
    )}>
      {!isCollapsed ? (
        <>
          {/* Fixed search bar */}
          <div className="px-2 py-3 border-b border-border bg-background flex-shrink-0">
            <Input
              type="text"
              placeholder="Jump to item #"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="h-8 text-sm"
            />
          </div>
          
          {/* Scrollable content - this is the ONLY scrollable area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
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
        </>
      ) : null}
    </div>
  );
};

export default TeleprompterSidebar;