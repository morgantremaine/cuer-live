
import React from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { getRowNumber, getCellValue } from '@/utils/sharedRundownUtils';
import { useRundownCalculations } from '@/hooks/useRundownCalculations';
import { getContrastTextColor } from '@/utils/colorUtils';

interface SharedRundownTableProps {
  items: RundownItem[];
  visibleColumns: any[];
  currentSegmentId: string | null;
}

const SharedRundownTable = ({ items, visibleColumns, currentSegmentId }: SharedRundownTableProps) => {
  // Use centralized calculation hook
  const { calculateHeaderDuration } = useRundownCalculations(items);

  return (
    <div className="overflow-hidden border rounded-lg print:border-gray-400 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-200 dark:bg-gray-700">
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider border-b print:border-gray-400 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
              #
            </th>
            {visibleColumns.map((column) => (
              <th
                key={column.id}
                className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider border-b print:border-gray-400 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              >
                {column.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="print:divide-gray-400 divide-y divide-gray-200 dark:divide-gray-700">
          {items.map((item, index) => {
            // Only non-header items can be current segments
            const isCurrentSegment = !isHeaderItem(item) && currentSegmentId === item.id;
            const isFloated = item.isFloating || item.isFloated;
            const hasCustomColor = item.color && item.color !== '#ffffff' && item.color !== '#FFFFFF' && item.color !== '';
            
            // Determine row classes and custom styles
            let rowClass = '';
            let customStyles: React.CSSProperties = {};
            
            if (isFloated) {
              rowClass = 'bg-red-600 text-white';
            } else if (hasCustomColor) {
              // Use inline styles for custom colors
              const contrastColor = getContrastTextColor(item.color);
              customStyles = {
                backgroundColor: item.color,
                color: contrastColor
              };
              rowClass = 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white';
            } else if (isHeaderItem(item)) {
              rowClass = 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-gray-400 dark:border-gray-600 font-semibold';
            } else {
              rowClass = 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white';
            }
            
            return (
              <tr
                key={item.id}
                className={`
                  ${rowClass}
                  ${isCurrentSegment ? 'border-l-4 border-red-500' : ''}
                  print:break-inside-avoid
                `}
                style={hasCustomColor && !isFloated ? customStyles : undefined}
              >
                <td className="px-3 py-2 whitespace-nowrap text-sm border-r print:border-gray-400 border-gray-200 dark:border-gray-700">
                  {isCurrentSegment && (
                    <span className="text-red-600 mr-1">▶</span>
                  )}
                  {isFloated && (
                    <span className="text-yellow-400 mr-1">🛟</span>
                  )}
                  {getRowNumber(index, items)}
                </td>
                
                {visibleColumns.map((column) => {
                  // For headers, handle special cases
                  if (isHeaderItem(item)) {
                    if (column.key === 'segmentName' || column.key === 'name') {
                      const value = column.key === 'segmentName' ? (item.notes || item.name || '') : (item.name || '');
                      return (
                        <td 
                          key={column.id} 
                          className="px-3 py-2 text-sm border-r print:border-gray-400 border-gray-200 dark:border-gray-700"
                        >
                          <div className="break-words whitespace-pre-wrap">{value}</div>
                        </td>
                      );
                    } else if (column.key === 'duration') {
                      return (
                        <td 
                          key={column.id} 
                          className="px-3 py-2 text-sm border-r print:border-gray-400 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                        >
                          <div className="break-words whitespace-pre-wrap">({calculateHeaderDuration(index)})</div>
                        </td>
                      );
                    } else if (column.key === 'startTime' || column.key === 'endTime' || column.key === 'elapsedTime') {
                      return (
                        <td 
                          key={column.id} 
                          className="px-3 py-2 text-sm border-r print:border-gray-400 border-gray-200 dark:border-gray-700"
                        >
                          <div className="break-words whitespace-pre-wrap">{getCellValue(item, column)}</div>
                        </td>
                      );
                    }
                  }
                  
                  const value = getCellValue(item, column);
                  
                  return (
                    <td
                      key={column.id}
                      className="px-3 py-2 text-sm border-r print:border-gray-400 border-gray-200 dark:border-gray-700"
                    >
                      <div className="break-words whitespace-pre-wrap">{value}</div>
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
};

export default SharedRundownTable;
