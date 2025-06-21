import React, { forwardRef } from 'react';
import { RundownItem } from '@/types/rundown';
import { getRowNumber, getCellValue } from '@/utils/sharedRundownUtils';
import { getContrastTextColor } from '@/utils/colorUtils';
import { Play } from 'lucide-react';

interface SharedRundownTableProps {
  items: RundownItem[];
  visibleColumns: any[];
  currentSegmentId: string | null;
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
  // Helper function to convert time string to seconds
  const timeToSeconds = (timeStr: string): number => {
    if (!timeStr) return 0;
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

  // Helper function to convert seconds to time string
  const secondsToTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper function to check if a URL is likely an image
  const isLikelyImageUrl = (url: string): boolean => {
    if (!url || !url.trim()) return false;
    return (
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url) ||
      /\.(jpg|jpeg|png|gif|webp|svg)\?/i.test(url) ||
      url.includes('images') ||
      url.includes('photos') ||
      url.includes('imgur') ||
      url.includes('unsplash') ||
      url.includes('drive.google.com') ||
      url.includes('gstatic.com') ||
      url.includes('amazonaws.com') ||
      url.includes('cloudinary.com')
    );
  };

  // Helper function to convert Google Drive links to direct image URLs
  const convertGoogleDriveUrl = (url: string): string => {
    // Check for different Google Drive link formats
    let fileId = null;
    
    // Format 1: https://drive.google.com/file/d/FILE_ID/view (with or without query params)
    const viewMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/view/);
    if (viewMatch) {
      fileId = viewMatch[1];
    }
    
    // Format 2: https://drive.google.com/file/d/FILE_ID (without /view)
    if (!fileId) {
      const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileMatch) {
        fileId = fileMatch[1];
      }
    }
    
    // If we found a file ID, convert to direct image URL using thumbnail API
    if (fileId) {
      const convertedUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400-h300`;
      return convertedUrl;
    }
    
    return url;
  };

  // Helper function to get balanced column width
  const getColumnWidth = (column: any): string => {
    const key = column.key || column.id;
    
    // Time-related columns should be narrow
    if (['duration', 'startTime', 'endTime', 'elapsedTime'].includes(key)) {
      return '100px';
    }
    
    // Images column should be narrow
    if (key === 'images') {
      return '80px';
    }
    
    // Segment name should be medium width
    if (key === 'segmentName' || key === 'name') {
      return '200px';
    }
    
    // Script and other text-heavy columns should be constrained
    if (key === 'script' || key === 'description' || key === 'notes') {
      return '300px';
    }
    
    // Other columns get medium width
    return '150px';
  };

  // Helper function to render cell content
  const renderCellContent = (item: RundownItem, column: any, calculatedStartTime: string) => {
    // Get the raw value first
    let value;
    
    // Check if this is the images column specifically
    if (column.key === 'images' || column.id === 'images') {
      value = item.images || '';
    } else {
      value = getCellValue(item, column, rundownStartTime, calculatedStartTime);
    }
    
    // Special handling for images column - render as image if it's a valid URL
    if ((column.key === 'images' || column.id === 'images') && value && isLikelyImageUrl(value)) {
      const displayUrl = convertGoogleDriveUrl(value);
      return (
        <div className="flex items-center justify-center h-16 print:h-8">
          <img
            src={displayUrl}
            alt="Rundown image"
            className="max-w-16 max-h-16 object-contain rounded print:max-w-8 print:max-h-8 print:grayscale"
            onError={(e) => {
              // If image fails to load, show the URL as text instead
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `<span class="text-xs text-gray-500 truncate print:text-black">${value}</span>`;
              }
            }}
          />
        </div>
      );
    }
    
    return value;
  };

  // Helper function to determine if a row has a custom color that should be preserved in print
  const hasCustomColor = (item: RundownItem): boolean => {
    if (item.type === 'header') return false; // Headers get default gray treatment
    if (item.isFloating || item.isFloated) return true; // Floated rows always have custom styling
    if (item.color && item.color !== '#ffffff' && item.color !== '#FFFFFF' && item.color !== '' && item.color !== 'white') return true;
    return false;
  };

  // Calculate start times for all items based on their position and durations
  const calculateItemTimes = () => {
    let currentTime = rundownStartTime;
    const itemsWithTimes: Array<{ item: RundownItem; calculatedStartTime: string }> = [];

    items.forEach((item, index) => {
      if (item.type === 'header') {
        // Headers don't advance time
        itemsWithTimes.push({ item, calculatedStartTime: currentTime });
      } else {
        // Regular items
        itemsWithTimes.push({ item, calculatedStartTime: currentTime });
        
        // Only advance time if item is not floated
        if (!item.isFloating && !item.isFloated && item.duration) {
          const durationSeconds = timeToSeconds(item.duration);
          const currentSeconds = timeToSeconds(currentTime);
          currentTime = secondsToTime(currentSeconds + durationSeconds);
        }
      }
    });

    return itemsWithTimes;
  };

  const calculateHeaderDuration = (headerIndex: number) => {
    if (headerIndex < 0 || headerIndex >= items.length || items[headerIndex].type !== 'header') {
      return '00:00:00';
    }

    let totalSeconds = 0;
    let i = headerIndex + 1;

    while (i < items.length && items[i].type !== 'header') {
      // Only count non-floated items in header duration
      if (!items[i].isFloating && !items[i].isFloated) {
        totalSeconds += timeToSeconds(items[i].duration || '00:00');
      }
      i++;
    }

    return secondsToTime(totalSeconds);
  };

  const itemsWithTimes = calculateItemTimes();

  return (
    <div 
      className={`border rounded-lg print:border-gray-400 print:shadow-none ${
        isDark ? 'border-gray-700 h-full' : 'border-gray-200 h-full'
      } print:h-auto print:max-h-none print:overflow-visible`} 
      ref={ref}
    >
      <div className="h-full overflow-auto print:overflow-visible print:h-auto">
        <table className="w-full print:text-xs table-fixed">
          <thead className={`sticky top-0 z-10 print:static ${
            isDark ? 'bg-gray-800' : 'bg-gray-50'
          } print:bg-gray-100`}>
            <tr>
              <th 
                className={`px-2 py-1 text-left text-xs font-medium uppercase tracking-wider border-b print:border-gray-400 print:bg-gray-100 print:text-black ${
                  isDark 
                    ? 'text-gray-300 border-gray-600 bg-gray-800' 
                    : 'text-gray-500 border-gray-200 bg-gray-50'
                }`}
                style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}
              >
                #
              </th>
              {visibleColumns.map((column) => {
                const columnWidth = getColumnWidth(column);
                return (
                  <th
                    key={column.id}
                    className={`px-2 py-1 text-left text-xs font-medium uppercase tracking-wider border-b print:border-gray-400 print:bg-gray-100 print:text-black ${
                      isDark 
                        ? 'text-gray-300 border-gray-600 bg-gray-800' 
                        : 'text-gray-500 border-gray-200 bg-gray-50'
                    }`}
                    style={{ width: columnWidth, minWidth: columnWidth, maxWidth: columnWidth }}
                  >
                    <div className="truncate">
                      {column.name}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className={`divide-y print:divide-gray-400 ${
            isDark 
              ? 'bg-gray-900 divide-gray-700' 
              : 'bg-white divide-gray-200'
          } print:bg-white print:divide-gray-400`}>
            {itemsWithTimes.map(({ item, calculatedStartTime }, index) => {
              const isShowcallerCurrent = item.type !== 'header' && currentSegmentId === item.id;
              const isCurrentlyPlaying = isShowcallerCurrent && isPlaying;
              const isFloated = item.isFloating || item.isFloated;
              const itemHasCustomColor = hasCustomColor(item);
              
              // Determine row styling classes
              let printRowClass = '';
              let rowStyles: React.CSSProperties = {};
              
              if (item.type === 'header') {
                printRowClass = 'print-header-row';
              } else if (isFloated) {
                printRowClass = 'print-floated-row print-custom-color-row';
                rowStyles = {
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                };
              } else if (itemHasCustomColor) {
                printRowClass = 'print-custom-color-row';
                const bgColor = item.color || '#ffffff';
                const textColor = getContrastTextColor(bgColor);
                rowStyles = {
                  backgroundColor: bgColor,
                  color: textColor,
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                };
              } else {
                printRowClass = 'print-default-row';
              }
              
              return (
                <tr
                  key={item.id}
                  data-item-id={item.id}
                  className={`
                    ${item.type === 'header' ? 'font-semibold' : ''}
                    ${printRowClass}
                    print:break-inside-avoid
                  `}
                  style={rowStyles}
                >
                  <td 
                    className={`px-2 py-1 whitespace-nowrap text-sm border-r print:border-gray-400 print:text-black ${
                      isDark ? 'border-gray-600' : 'border-gray-200'
                    }`}
                    style={{ 
                      width: '60px', 
                      minWidth: '60px', 
                      maxWidth: '60px',
                      ...(itemHasCustomColor ? rowStyles : {})
                    }}
                  >
                    <div className="flex items-center">
                      {/* Blue play icon for current segment - hidden in print */}
                      {isShowcallerCurrent && (
                        <Play 
                          className="h-5 w-5 text-blue-500 fill-blue-500 mr-2 print:hidden" 
                        />
                      )}
                      {isFloated && (
                        <span className="text-yellow-400 mr-1 print:mr-0.5 print:text-yellow-600 print:hidden">🛟</span>
                      )}
                      <span>{getRowNumber(index, items)}</span>
                    </div>
                  </td>
                  
                  {visibleColumns.map((column) => {
                    const columnWidth = getColumnWidth(column);
                    // Check if this is the current segment and this is the segment name column
                    const isCurrentSegmentName = isShowcallerCurrent && 
                      (column.key === 'segmentName' || column.key === 'name');
                    
                    // For headers, handle special cases
                    if (item.type === 'header') {
                      if (column.key === 'segmentName' || column.key === 'name') {
                        return (
                          <td 
                            key={column.id} 
                            className={`px-2 py-1 text-sm border-r print:border-gray-400 print:text-black ${
                              isDark ? 'border-gray-600' : 'border-gray-200'
                            }`}
                            style={{ 
                              width: columnWidth, 
                              minWidth: columnWidth, 
                              maxWidth: columnWidth
                            }}
                          >
                            <div className="break-words whitespace-pre-wrap overflow-hidden">{item.name || ''}</div>
                          </td>
                        );
                      } else if (column.key === 'duration') {
                        return (
                          <td 
                            key={column.id} 
                            className={`px-2 py-1 text-sm border-r print:border-gray-400 print:text-gray-600 ${
                              isDark 
                                ? 'text-gray-400 border-gray-600' 
                                : 'text-gray-600 border-gray-200'
                            }`}
                            style={{ 
                              width: columnWidth, 
                              minWidth: columnWidth, 
                              maxWidth: columnWidth
                            }}
                          >
                            <div className="break-words whitespace-pre-wrap overflow-hidden">({calculateHeaderDuration(index)})</div>
                          </td>
                        );
                      } else if (column.key === 'startTime' || column.key === 'endTime' || column.key === 'elapsedTime') {
                        return (
                          <td 
                            key={column.id} 
                            className={`px-2 py-1 text-sm border-r print:border-gray-400 ${
                              isDark ? 'border-gray-600' : 'border-gray-200'
                            }`}
                            style={{ 
                              width: columnWidth, 
                              minWidth: columnWidth, 
                              maxWidth: columnWidth
                            }}
                          >
                            <div className="break-words whitespace-pre-wrap overflow-hidden"></div>
                          </td>
                        );
                      } else {
                        return (
                          <td 
                            key={column.id} 
                            className={`px-2 py-1 text-sm border-r print:border-gray-400 ${
                              isDark ? 'border-gray-600' : 'border-gray-200'
                            }`}
                            style={{ 
                              width: columnWidth, 
                              minWidth: columnWidth, 
                              maxWidth: columnWidth
                            }}
                          >
                            <div className="break-words whitespace-pre-wrap overflow-hidden"></div>
                          </td>
                        );
                      }
                    }
                    
                    // For regular items, render content with proper styling
                    return (
                      <td
                        key={column.id}
                        className={`px-2 py-1 text-sm border-r print:border-gray-400 print:text-black ${
                          isDark ? 'border-gray-600' : 'border-gray-200'
                        } ${
                          isCurrentSegmentName ? 'bg-blue-500 text-white print:bg-blue-500 print:text-white' : ''
                        }`}
                        style={{ 
                          width: columnWidth, 
                          minWidth: columnWidth, 
                          maxWidth: columnWidth,
                          ...(itemHasCustomColor && !isCurrentSegmentName ? rowStyles : {})
                        }}
                      >
                        <div className="break-words whitespace-pre-wrap overflow-hidden">
                          {renderCellContent(item, column, calculatedStartTime)}
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
    </div>
  );
});

SharedRundownTable.displayName = 'SharedRundownTable';

export default SharedRundownTable;
