
import React from 'react';
import { RundownItem } from '@/types/rundown';
import { getRowNumber, getCellValue } from '@/utils/sharedRundownUtils';

interface SharedRundownTableProps {
  items: RundownItem[];
  visibleColumns: any[];
  currentSegmentId: string | null;
}

const SharedRundownTable = ({ items, visibleColumns, currentSegmentId }: SharedRundownTableProps) => {
  // Calculate header duration (sum of all non-floated regular items until next header)
  const calculateHeaderDuration = (headerIndex: number) => {
    if (headerIndex < 0 || headerIndex >= items.length || items[headerIndex].type !== 'header') {
      return '00:00:00';
    }

    const timeToSeconds = (timeStr: string) => {
      const parts = timeStr.split(':').map(Number);
      if (parts.length === 2) {
        const [minutes, seconds] = parts;
        return minutes * 60 + seconds;
      } else if (parts.length === 3) {
        const [hours, minutes, seconds] = parts;
        return hours * 3600 + minutes * 60 + seconds;
      }
      return 0;
    };

    let totalSeconds = 0;
    let i = headerIndex + 1;

    while (i < items.length && items[i].type !== 'header') {
      // Only count non-floated items in header duration
      if (!items[i].isFloating && !items[i].isFloated) {
        totalSeconds += timeToSeconds(items[i].duration || '00:00');
      }
      i++;
    }

    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  };

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
            // Only show showcaller arrow for non-header items with current status
            const isShowcallerCurrent = item.type !== 'header' && currentSegmentId === item.id;
            const isFloated = item.isFloating || item.isFloated;
            
            return (
              <tr
                key={item.id}
                className={`
                  ${item.type === 'header' ? 'bg-gray-100 font-semibold print:bg-gray-200' : ''}
                  ${isFloated ? 'bg-red-800 text-white opacity-75' : ''}
                  print:break-inside-avoid
                `}
                style={{ backgroundColor: item.color !== '#ffffff' && item.color && !isFloated ? item.color : undefined }}
              >
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200 print:border-gray-400">
                  {isShowcallerCurrent && (
                    <span 
                      className="text-green-600 mr-1 text-lg scale-125 inline-block"
                      style={{ textShadow: '0 0 1px black' }}
                    >
                      ▶
                    </span>
                  )}
                  {isFloated && (
                    <span className="text-yellow-400 mr-1">🛟</span>
                  )}
                  {getRowNumber(index, items)}
                </td>
                
                {visibleColumns.map((column) => {
                  // For headers, handle special cases
                  if (item.type === 'header') {
                    if (column.key === 'segmentName') {
                      // Show the header description/notes
                      return (
                        <td key={column.id} className="px-3 py-2 text-sm text-gray-900 border-r border-gray-200 print:border-gray-400">
                          <div className="break-words whitespace-pre-wrap">{item.notes || item.name || ''}</div>
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
                      // Don't show time fields for headers
                      return (
                        <td key={column.id} className="px-3 py-2 text-sm text-gray-900 border-r border-gray-200 print:border-gray-400">
                          <div className="break-words whitespace-pre-wrap"></div>
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
