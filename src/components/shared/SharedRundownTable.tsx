
import React from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';
import { getRowStatus } from '@/utils/rundownCalculations';

interface SharedRundownTableProps {
  items: RundownItem[];
  visibleColumns: Column[];
  currentTime: Date;
  currentSegmentId?: string | null;
  getColumnWidth: (column: Column) => string;
  getRowNumber: (index: number) => string;
  getHeaderDuration: (index: number) => string;
}

const SharedRundownTable = ({
  items,
  visibleColumns,
  currentTime,
  currentSegmentId,
  getColumnWidth,
  getRowNumber,
  getHeaderDuration
}: SharedRundownTableProps) => {
  const renderCellContent = (item: RundownItem, column: Column) => {
    const fieldKey = column.key;
    
    // Handle calculated fields
    if (fieldKey === 'startTime') {
      return (item as any).startTime || '00:00:00';
    }
    if (fieldKey === 'endTime') {
      return (item as any).endTime || '00:00:00';
    }
    if (fieldKey === 'elapsedTime') {
      return (item as any).elapsedTime || '00:00:00';
    }
    
    // Handle standard fields
    if (fieldKey === 'segmentName') return item.name || '';
    if (fieldKey in item) return (item as any)[fieldKey] || '';
    
    // Handle custom fields
    if (item.customFields && fieldKey in item.customFields) {
      return item.customFields[fieldKey] || '';
    }
    
    return '';
  };

  return (
    <div className="relative w-full overflow-auto bg-background">
      <table className="w-full border-collapse border border-border">
        <thead className="sticky top-0 z-10 bg-muted">
          <tr>
            <th className="w-12 p-2 text-left font-medium border-b border-border bg-muted">#</th>
            {visibleColumns.map((column) => (
              <th
                key={column.id}
                className="p-2 text-left font-medium border-b border-border bg-muted"
                style={{ width: getColumnWidth(column) }}
              >
                {column.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-background">
          {items.map((item, index) => {
            const rowNumber = getRowNumber(index);
            const status = getRowStatus(item, currentTime);
            const isCurrentlyPlaying = item.id === currentSegmentId;
            const isHeader = isHeaderItem(item);

            return (
              <React.Fragment key={item.id}>
                {/* Show green line ABOVE the current segment */}
                {isCurrentlyPlaying && (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} className="p-0">
                      <div className="h-1 bg-green-500 w-full"></div>
                    </td>
                  </tr>
                )}
                
                <tr
                  className={`
                    border-b border-border hover:bg-muted/50 transition-colors
                    ${isHeader ? 'bg-blue-50 dark:bg-blue-950' : ''}
                    ${status === 'current' ? 'bg-green-50 dark:bg-green-950' : ''}
                    ${status === 'completed' ? 'bg-gray-50 dark:bg-gray-900' : ''}
                    ${isCurrentlyPlaying ? 'ring-2 ring-green-500' : ''}
                  `}
                  style={{ backgroundColor: item.color && item.color !== '#ffffff' ? `${item.color}20` : undefined }}
                >
                  {/* Row number */}
                  <td className="w-12 p-2 text-sm text-muted-foreground border-r border-border">
                    {isHeader ? '' : rowNumber}
                  </td>
                  
                  {/* Data cells */}
                  {visibleColumns.map((column) => (
                    <td
                      key={column.id}
                      className="p-2 border-r border-border last:border-r-0"
                      style={{ width: getColumnWidth(column) }}
                    >
                      <div className="text-sm">
                        {renderCellContent(item, column)}
                      </div>
                    </td>
                  ))}
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      
      {items.length === 0 && (
        <div className="p-4 text-center text-muted-foreground bg-background border border-border rounded">
          No items to display
        </div>
      )}
    </div>
  );
};

export default SharedRundownTable;
