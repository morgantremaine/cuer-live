import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';

interface UseVirtualizedTableProps {
  items: any[];
  rowHeight: number;
  containerHeight: number;
  overscanCount?: number;
}

/**
 * Virtual scrolling hook for large tables
 * Only renders visible rows to drastically reduce DOM size and memory usage
 */
export const useVirtualizedTable = ({
  items,
  rowHeight = 48,
  containerHeight = 600,
  overscanCount = 5
}: UseVirtualizedTableProps) => {
  
  const shouldVirtualize = items.length > 50; // Only virtualize large lists
  
  // Create virtualized list component
  const VirtualizedList = useMemo(() => {
    if (!shouldVirtualize) {
      return null; // Don't virtualize small lists
    }
    
    return ({ children: renderRow }: { children: ({ index, style }: any) => React.ReactNode }) => (
      <div className="virtualized-table-container" style={{ height: containerHeight }}>
        <List
          height={containerHeight}
          itemCount={items.length}
          itemSize={rowHeight}
          overscanCount={overscanCount}
        >
          {renderRow}
        </List>
      </div>
    );
  }, [shouldVirtualize, items.length, rowHeight, containerHeight, overscanCount]);

  return {
    shouldVirtualize,
    VirtualizedList,
    itemCount: items.length
  };
};