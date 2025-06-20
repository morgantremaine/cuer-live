
import React from 'react';
import { Play } from 'lucide-react';
import { getContrastTextColor } from '@/utils/colorUtils';
import { calculateItemsWithTiming, calculateHeaderDuration } from '@/utils/rundownCalculations';
import SharedCellRenderer from './SharedCellRenderer';

interface SharedRundownTableProps {
  items: any[];
  visibleColumns: any[];
  currentSegmentId: string | null;
  isPlaying: boolean;
  rundownStartTime: string;
}

const SharedRundownTable = ({ 
  items, 
  visibleColumns, 
  currentSegmentId, 
  isPlaying,
  rundownStartTime 
}: SharedRundownTableProps) => {
  // Calculate all timing information for items
  const itemsWithTimes = calculateItemsWithTiming(items, rundownStartTime);

  const getRowNumber = (index: number) => {
    let rowCount = 1;
    for (let i = 0; i < index; i++) {
      if (items[i].type !== 'header') {
        rowCount++;
      }
    }
    return items[index].type === 'header' ? 'H' : rowCount.toString();
  };

  return (
    <div className="w-full overflow-auto">
      <table className="w-full border-collapse border border-gray-300 print:border-gray-400">
        <thead>
          <tr className="bg-gray-100 print:bg-gray-200">
            <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-sm w-16 min-w-16 print:border-gray-400">
              #
            </th>
            {visibleColumns.map((column) => (
              <th
                key={column.id}
                className="border border-gray-300 px-3 py-2 text-left font-semibold text-sm print:border-gray-400"
                style={{ 
                  width: column.width, 
                  minWidth: column.width 
                }}
              >
                {column.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {itemsWithTimes.map((item, index) => {
            const rowNumber = getRowNumber(index);
            const isCurrentlyPlaying = item.id === currentSegmentId;
            const isHeader = item.type === 'header';
            
            // Use item color for background, with special handling for headers
            const backgroundColor = item.color && item.color !== '#FFFFFF' && item.color !== '#ffffff' ? item.color : undefined;
            const textColor = backgroundColor ? getContrastTextColor(backgroundColor) : undefined;

            return (
              <tr 
                key={item.id}
                className={`border-b border-gray-300 print:border-gray-400 ${
                  isHeader ? 'bg-gray-50 print:bg-gray-100 font-medium h-14 min-h-14' : 'h-12 min-h-12'
                }`}
                style={{
                  backgroundColor: !isHeader ? backgroundColor : undefined
                }}
              >
                {/* Row number column */}
                <td 
                  className="border border-gray-300 px-2 py-1 text-sm font-mono align-middle w-16 min-w-16 print:border-gray-400"
                  style={{ backgroundColor: !isHeader ? backgroundColor : undefined }}
                >
                  <div className="flex items-center space-x-1">
                    {isCurrentlyPlaying && isPlaying && (
                      <Play 
                        className="h-4 w-4 text-blue-600 fill-blue-600" 
                      />
                    )}
                    <span style={{ color: textColor }}>{rowNumber}</span>
                  </div>
                </td>

                {/* Dynamic columns */}
                {visibleColumns.map((column) => {
                  const isCurrentSegmentName = currentSegmentId === item.id && 
                    (column.key === 'segmentName' || column.key === 'name');
                  
                  return (
                    <td
                      key={column.id}
                      className={`border border-gray-300 align-middle print:border-gray-400 ${isCurrentSegmentName ? 'relative' : ''}`}
                      style={{ 
                        width: column.width, 
                        minWidth: column.width,
                        backgroundColor: !isHeader ? backgroundColor : undefined
                      }}
                    >
                      {isHeader ? (
                        // Special handling for headers
                        <>
                          {(column.key === 'segmentName' || column.key === 'name') ? (
                            <SharedCellRenderer
                              column={column}
                              item={item}
                              currentSegmentId={currentSegmentId}
                              backgroundColor={backgroundColor}
                            />
                          ) : column.key === 'duration' ? (
                            <div className="px-3 py-2 text-sm font-medium text-gray-600">
                              ({calculateHeaderDuration(items, index)})
                            </div>
                          ) : (
                            <div className="px-3 py-2"></div>
                          )}
                        </>
                      ) : (
                        // Regular row content
                        <SharedCellRenderer
                          column={column}
                          item={item}
                          currentSegmentId={currentSegmentId}
                          backgroundColor={backgroundColor}
                        />
                      )}
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
