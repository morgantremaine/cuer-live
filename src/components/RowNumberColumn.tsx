import React from 'react';
import { Play, ChevronDown, ChevronRight } from 'lucide-react';
import { RundownItem } from '@/hooks/useRundownItems';
import { getContrastTextColor } from '@/utils/colorUtils';

interface RowNumberColumnProps {
  items: RundownItem[];
  getRowNumber: (index: number) => string;
  currentSegmentId: string | null;
  selectedRows: Set<string>;
  zoomLevel?: number;
  onToggleCollapse?: (headerId: string) => void;
  isHeaderCollapsed?: (headerId: string) => boolean;
  onToggleAllHeaders?: () => void;
}

const RowNumberColumn = React.memo<RowNumberColumnProps>(({
  items,
  getRowNumber,
  currentSegmentId,
  selectedRows,
  zoomLevel = 1.0,
  onToggleCollapse,
  isHeaderCollapsed,
  onToggleAllHeaders
}) => {
  const hasHeaders = items.some(item => item.type === 'header');
  const hasCollapsedHeaders = hasHeaders && items.filter(item => item.type === 'header').some(header => isHeaderCollapsed?.(header.id));

  return (
    <div className="frozen-column bg-background" style={{ width: '64px', flexShrink: 0 }}>
      {/* Header */}
      <div 
        className="sticky top-0 z-20 bg-blue-600 dark:bg-blue-700"
        style={{ 
          height: `${40 * zoomLevel}px`,
          width: '64px'
        }}
      >
        <div 
          className="flex items-center justify-center w-full h-full text-white"
          style={{ height: '100%' }}
        >
          {onToggleAllHeaders && isHeaderCollapsed && hasHeaders && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleAllHeaders();
              }}
              className="p-0.5 hover:bg-blue-500 rounded transition-colors"
              title="Toggle all header groups"
            >
              {hasCollapsedHeaders ? (
                <ChevronRight className="h-3 w-3 text-white" />
              ) : (
                <ChevronDown className="h-3 w-3 text-white" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Body Rows */}
      <div>
        {items.map((item, index) => {
          const isCurrentlyPlaying = item.id === currentSegmentId;
          const isSelected = selectedRows.has(item.id);
          const rowNumber = getRowNumber(index);
          const backgroundColor = item.color; // Use item.color if it exists
          const textColor = backgroundColor ? getContrastTextColor(backgroundColor) : undefined;
          const isCollapsed = item.type === 'header' && isHeaderCollapsed?.(item.id);

          if (item.type === 'header') {
            // Header row
            const cellBackgroundColor = backgroundColor || 'hsl(var(--header-background))';
            
            return (
              <div
                key={item.id}
                className="border-b border-border"
                style={{
                  height: '115px',
                  width: '64px',
                  backgroundColor: cellBackgroundColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCollapse?.(item.id);
                  }}
                  className="flex items-center justify-center p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                  title={isCollapsed ? 'Expand header' : 'Collapse header'}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  )}
                </button>
              </div>
            );
          } else {
            // Regular row
            return (
              <div
                key={item.id}
                className="border-b border-border px-2 py-1 text-sm font-mono"
                style={{
                  height: 'auto',
                  minHeight: '40px',
                  width: '64px',
                  backgroundColor: backgroundColor || (isSelected ? 'hsl(var(--accent))' : 'hsl(var(--background))'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div className="flex items-center justify-center relative w-full">
                  {isCurrentlyPlaying && (
                    <Play 
                      className="h-6 w-6 text-blue-500 fill-blue-500 absolute left-0" 
                    />
                  )}
                  <span style={{ color: textColor }} className={isCurrentlyPlaying ? 'ml-5' : ''}>
                    {rowNumber}
                  </span>
                </div>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
});

RowNumberColumn.displayName = 'RowNumberColumn';

export default RowNumberColumn;
