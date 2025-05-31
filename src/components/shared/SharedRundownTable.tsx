
import React from 'react';
import { RundownItem } from '@/types/rundown';
import { getRowNumber, getCellValue } from '@/utils/sharedRundownUtils';

interface SharedRundownTableProps {
  items: RundownItem[];
  visibleColumns: any[];
  currentSegmentId: string | null;
}

const SharedRundownTable = ({ items, visibleColumns, currentSegmentId }: SharedRundownTableProps) => {
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
            const isCurrentSegment = item.type !== 'header' && currentSegmentId === item.id;
            
            return (
              <tr
                key={item.id}
                className={`
                  ${item.type === 'header' ? 'bg-gray-100 font-semibold print:bg-gray-200' : ''}
                  ${isCurrentSegment ? 'bg-red-50 border-l-4 border-red-500' : ''}
                  print:break-inside-avoid
                `}
                style={{ backgroundColor: item.color !== '#ffffff' && item.color ? item.color : undefined }}
              >
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200 print:border-gray-400">
                  {isCurrentSegment && (
                    <span className="text-red-600 mr-1">▶</span>
                  )}
                  {getRowNumber(index, items)}
                </td>
                
                {visibleColumns.map((column) => {
                  const value = getCellValue(item, column);
                  
                  return (
                    <td
                      key={column.id}
                      className="px-3 py-2 text-sm text-gray-900 border-r border-gray-200 print:border-gray-400"
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
