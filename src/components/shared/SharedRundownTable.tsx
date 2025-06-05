
import React from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { getRowNumber, getCellValue } from '@/utils/sharedRundownUtils';
import { useRundownCalculations } from '@/hooks/useRundownCalculations';
import { useTheme } from '@/hooks/useTheme';
import { getContrastTextColor } from '@/utils/colorUtils';

interface SharedRundownTableProps {
  items: RundownItem[];
  visibleColumns: any[];
  currentSegmentId: string | null;
}

const SharedRundownTable = ({ items, visibleColumns, currentSegmentId }: SharedRundownTableProps) => {
  const { isDark } = useTheme();
  // Use centralized calculation hook
  const { calculateHeaderDuration } = useRundownCalculations(items);

  // Define colors based on theme - same as main app
  const headerBackgroundColor = isDark ? '#212936' : '#e5e7eb';
  const regularRowBackgroundColor = isDark ? '#394150' : '#ffffff';
  const headerTextColor = isDark ? '#ffffff' : '#1f2937'; // gray-800 for light mode
  const regularTextColor = isDark ? '#ffffff' : '#1f2937'; // gray-800 for light mode

  return (
    <div className="overflow-hidden border border-gray-200 rounded-lg print:border-gray-400">
      <table className="w-full">
        <thead>
          <tr style={{ backgroundColor: headerBackgroundColor }}>
            <th 
              className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider border-b border-gray-200 print:border-gray-400"
              style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
            >
              #
            </th>
            {visibleColumns.map((column) => (
              <th
                key={column.id}
                className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider border-b border-gray-200 print:border-gray-400"
                style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
              >
                {column.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 print:divide-gray-400">
          {items.map((item, index) => {
            // Only non-header items can be current segments
            const isCurrentSegment = !isHeaderItem(item) && currentSegmentId === item.id;
            const isFloated = item.isFloating || item.isFloated;
            const hasCustomColor = item.color && item.color !== '#ffffff' && item.color !== '#FFFFFF' && item.color !== '';
            
            // Determine row background color
            let rowBackgroundColor: string;
            let rowTextColor: string;
            
            if (isFloated) {
              rowBackgroundColor = '#dc2626'; // red-600
              rowTextColor = '#ffffff';
            } else if (hasCustomColor) {
              rowBackgroundColor = item.color;
              rowTextColor = getContrastTextColor(item.color);
            } else if (isHeaderItem(item)) {
              rowBackgroundColor = headerBackgroundColor;
              rowTextColor = headerTextColor;
            } else {
              rowBackgroundColor = regularRowBackgroundColor;
              rowTextColor = regularTextColor;
            }
            
            return (
              <tr
                key={item.id}
                className={`
                  ${isHeaderItem(item) ? 'font-semibold' : ''}
                  ${isCurrentSegment ? 'border-l-4 border-red-500' : ''}
                  print:break-inside-avoid
                `}
                style={{ 
                  backgroundColor: rowBackgroundColor,
                  color: rowTextColor
                }}
              >
                <td 
                  className="px-3 py-2 whitespace-nowrap text-sm border-r border-gray-200 print:border-gray-400"
                  style={{ color: rowTextColor }}
                >
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
                      // Show the header description/notes for segmentName, actual name for name
                      const value = column.key === 'segmentName' ? (item.notes || item.name || '') : (item.name || '');
                      return (
                        <td 
                          key={column.id} 
                          className="px-3 py-2 text-sm border-r border-gray-200 print:border-gray-400"
                          style={{ color: rowTextColor }}
                        >
                          <div className="break-words whitespace-pre-wrap">{value}</div>
                        </td>
                      );
                    } else if (column.key === 'duration') {
                      // Show the calculated header duration (excluding floated items)
                      return (
                        <td 
                          key={column.id} 
                          className="px-3 py-2 text-sm border-r border-gray-200 print:border-gray-400"
                          style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
                        >
                          <div className="break-words whitespace-pre-wrap">({calculateHeaderDuration(index)})</div>
                        </td>
                      );
                    } else if (column.key === 'startTime' || column.key === 'endTime' || column.key === 'elapsedTime') {
                      // Show time fields for headers
                      return (
                        <td 
                          key={column.id} 
                          className="px-3 py-2 text-sm border-r border-gray-200 print:border-gray-400"
                          style={{ color: rowTextColor }}
                        >
                          <div className="break-words whitespace-pre-wrap">{getCellValue(item, column)}</div>
                        </td>
                      );
                    }
                  }
                  
                  // For regular items, use the standard cell value
                  const value = getCellValue(item, column);
                  
                  return (
                    <td
                      key={column.id}
                      className="px-3 py-2 text-sm border-r border-gray-200 print:border-gray-400"
                      style={{ color: rowTextColor }}
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
