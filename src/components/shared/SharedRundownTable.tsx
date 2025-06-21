
import React, { forwardRef } from 'react';
import { RundownItem } from '@/types/rundown';
import { getRowNumber, getCellValue } from '@/utils/sharedRundownUtils';
import { calculateItemsWithTiming } from '@/utils/rundownCalculations';

interface SharedRundownTableProps {
  items: RundownItem[];
  visibleColumns: any[];
  currentSegmentId?: string | null;
  isPlaying?: boolean;
  rundownStartTime?: string;
  isDark?: boolean;
}

const SharedRundownTable = forwardRef<HTMLDivElement, SharedRundownTableProps>(({
  items,
  visibleColumns,
  currentSegmentId,
  isPlaying = false,
  rundownStartTime = '09:00:00',
  isDark = false
}, ref) => {
  // Calculate times using the unified calculation system
  const calculatedItems = calculateItemsWithTiming(items, rundownStartTime);

  return (
    <div ref={ref} className="overflow-auto">
      <table className={`w-full border-collapse ${isDark ? 'text-white' : 'text-black'}`}>
        <thead>
          <tr className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'} border-b`}>
            <th className={`p-3 text-left font-medium border-r ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
              #
            </th>
            {visibleColumns.map((column) => (
              <th 
                key={column.key} 
                className={`p-3 text-left font-medium border-r ${isDark ? 'border-gray-700' : 'border-gray-300'}`}
                style={{ minWidth: column.width || 'auto' }}
              >
                {column.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {calculatedItems.map((item, index) => {
            const isCurrentSegment = currentSegmentId === item.id;
            const isHeader = item.type === 'header';
            const rowNumber = getRowNumber(index, items); // Use the unified row numbering
            
            return (
              <tr 
                key={item.id}
                className={`
                  border-b transition-colors duration-200
                  ${isDark ? 'border-gray-700' : 'border-gray-200'}
                  ${isCurrentSegment && isPlaying ? 
                    (isDark ? 'bg-blue-900/50 text-white' : 'bg-blue-100 text-black') : 
                    isHeader ? 
                      (isDark ? 'bg-gray-800 text-white' : 'bg-gray-50 text-black') :
                      (isDark ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-white text-black hover:bg-gray-50')
                  }
                `}
              >
                <td className={`p-3 font-mono text-sm border-r ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
                  {rowNumber}
                </td>
                {visibleColumns.map((column) => {
                  const calculatedItem = calculatedItems[index];
                  const cellValue = getCellValue(
                    item, 
                    column, 
                    rundownStartTime, 
                    calculatedItem?.calculatedStartTime
                  );
                  
                  return (
                    <td 
                      key={column.key} 
                      className={`p-3 border-r ${isDark ? 'border-gray-700' : 'border-gray-300'}`}
                      style={{ minWidth: column.width || 'auto' }}
                    >
                      <div className="truncate">
                        {cellValue}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

SharedRundownTable.displayName = 'SharedRundownTable';

export default SharedRundownTable;
