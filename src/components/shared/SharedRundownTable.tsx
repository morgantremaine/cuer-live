
import React from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { getRowNumber, getCellValue } from '@/utils/sharedRundownUtils';
import { useRundownCalculations } from '@/hooks/useRundownCalculations';

interface SharedRundownTableProps {
  items: RundownItem[];
  visibleColumns: any[];
  currentSegmentId: string | null;
}

const SharedRundownTable = ({ items, visibleColumns, currentSegmentId }: SharedRundownTableProps) => {
  // Use centralized calculation hook
  const { calculateHeaderDuration } = useRundownCalculations(items);

  return (
    <div className="overflow-hidden border border-gray-200 rounded-lg print:border-gray-400">
      <table className="w-full">
        <thead className="bg-gray-50 print:bg-gray-100">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 print:border-gray-400">
              #
            </th>
            {visibleColumns.map((column) => (
              <th
                key={column.id}
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 print:border-gray-400"
              >
                {column.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200 print:divide-gray-400">
          {items.map((item, index) => {
            // Only non-header items can be current segments
            const isCurrentSegment = !isHeaderItem(item) && currentSegmentId === item.id;
            const isFloated = item.isFloating || item.isFloated;
            
            return (
              <tr
                key={item.id}
                className={`
                  ${isHeaderItem(item) ? 'bg-gray-100 font-semibold print:bg-gray-200' : ''}
                  ${isCurrentSegment ? 'bg-red-50 border-l-4 border-red-500' : ''}
                  ${isFloated ? 'bg-red-800 text-white opacity-75' : ''}
                  print:break-inside-avoid
                `}
                style={{ backgroundColor: item.color !== '#ffffff' && item.color && !isFloated ? item.color : undefined }}
              >
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200 print:border-gray-400">
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
                        <td key={column.id} className="px-3 py-2 text-sm text-gray-900 border-r border-gray-200 print:border-gray-400">
                          <div className="break-words whitespace-pre-wrap">{value}</div>
                        </td>
                      );
                    } else if (column.key === 'duration') {
                      // Show the calculated header duration (excluding floated items)
                      return (
                        <td key={column.id} className="px-3 py-2 text-sm text-gray-600 border-r border-gray-200 print:border-gray-400">
                          <div className="break-words whitespace-pre-wrap">({calculateHeaderDuration(index)})</div>
                        </td>
                      );
                    } else if (column.key === 'startTime' || column.key === 'endTime' || column.key === 'elapsedTime') {
                      // Show time fields for headers
                      return (
                        <td key={column.id} className="px-3 py-2 text-sm text-gray-900 border-r border-gray-200 print:border-gray-400">
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
                      className={`px-3 py-2 text-sm border-r border-gray-200 print:border-gray-400 ${isFloated ? 'text-white' : 'text-gray-900'}`}
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
