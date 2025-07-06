
import React, { forwardRef, useState } from 'react';
import { RundownItem } from '@/types/rundown';
import { getRowNumber, getCellValue } from '@/utils/sharedRundownUtils';
import { getContrastTextColor } from '@/utils/colorUtils';
import { renderScriptWithBrackets, isNullScript } from '@/utils/scriptUtils';
import { Play, ChevronDown, ChevronRight } from 'lucide-react';

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
  // State for managing expanded script/notes cells
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set());
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

  // Helper function to toggle expanded state of a cell
  const toggleCellExpanded = (itemId: string, columnKey: string) => {
    const cellKey = `${itemId}-${columnKey}`;
    setExpandedCells(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cellKey)) {
        newSet.delete(cellKey);
      } else {
        newSet.add(cellKey);
      }
      return newSet;
    });
  };

  // Helper function to check if a cell is expanded
  const isCellExpanded = (itemId: string, columnKey: string): boolean => {
    const cellKey = `${itemId}-${columnKey}`;
    return expandedCells.has(cellKey);
  };

  // Helper function to render expandable cell content for script and notes
  const renderExpandableCell = (value: string, itemId: string, columnKey: string) => {
    const isExpanded = isCellExpanded(itemId, columnKey);
    const hasContent = value && value.trim() && !isNullScript(value);
    
    if (!hasContent) {
      return null;
    }

    return (
      <div className="w-full">
        <div className="flex items-start gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleCellExpanded(itemId, columnKey);
            }}
            className={`flex-shrink-0 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors print:hidden ${
              isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'
            }`}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
          
          <div className="flex-1 min-w-0">
            {isExpanded ? (
              <div className="whitespace-pre-wrap break-words text-sm">
                {columnKey === 'script' ? 
                  renderScriptWithBrackets(value, { inlineDisplay: false, fontSize: 14 }) : 
                  value
                }
              </div>
            ) : (
              <div className="truncate text-sm" title={value}>
                {columnKey === 'script' ? 
                  renderScriptWithBrackets(value, { inlineDisplay: true, fontSize: 14 }) : 
                  value
                }
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
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
        <div className="flex items-center justify-center h-16">
          <img
            src={displayUrl}
            alt="Rundown image"
            className="max-w-16 max-h-16 object-contain rounded print:max-w-12 print:max-h-12"
            onError={(e) => {
              // If image fails to load, show the URL as text instead
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `<span class="text-xs text-gray-500 truncate">${value}</span>`;
              }
            }}
          />
        </div>
      );
    }
    
    // Use expandable cell for script and notes columns
    if (column.key === 'script' || column.key === 'notes') {
      return renderExpandableCell(value, item.id, column.key);
    }
    
    return value;
  };

  // Helper function to determine if a row has a custom color that should be preserved in print
  const hasCustomColor = (item: RundownItem): boolean => {
    if (item.type === 'header') return true; // Headers always have custom styling
    if (item.isFloating || item.isFloated) return true; // Floated rows always have custom styling
    if (item.color && item.color !== '#ffffff' && item.color !== '#FFFFFF' && item.color !== '') return true;
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
    <>
      <style>
        {`
          @media print {
            /* Force print to use full page height and remove ALL overflow constraints */
            * {
              overflow: visible !important;
            }
            
            body, html {
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
            }
            
            /* Make ALL containers take full available space */
            .print-container,
            .print-scroll-container {
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
              min-height: auto !important;
            }
            
            /* Remove flex constraints that might limit height */
            .flex-1 {
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
            }
            
            .print-table {
              width: 100% !important;
              table-layout: auto !important;
              font-size: 10px !important;
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
            }
            
            .print-table th,
            .print-table td {
              padding: 3px 4px !important;
              font-size: 10px !important;
              line-height: 1.3 !important;
              word-break: normal !important;
              overflow-wrap: break-word !important;
              white-space: normal !important;
              border: 0.5px solid #666 !important;
              vertical-align: top !important;
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
            }
            
            .print-table th {
              font-size: 9px !important;
              font-weight: bold !important;
              background: #f0f0f0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color: #000 !important;
            }
            
            .print-header-row {
              background: #e5e5e5 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            .print-header-row td {
              background: #e5e5e5 !important;
              color: #000 !important;
              font-weight: bold !important;
            }
            
            /* Only preserve colors for rows that actually have custom colors */
            .print-custom-colored-row {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            .print-floated-row {
              background: #dc2626 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            .print-floated-row td {
              background: #dc2626 !important;
              color: #fff !important;
            }
            
            /* Default rows should not preserve colors - let browser handle them normally */
            .print-default-row {
              background: transparent !important;
              color: #000 !important;
            }
            
            .print-default-row td {
              background: transparent !important;
              color: #000 !important;
            }
            
            .print-row-number {
              width: 40px !important;
              min-width: 40px !important;
              max-width: 40px !important;
            }
            
            .print-time-column {
              width: 80px !important;
              min-width: 80px !important;
              max-width: 80px !important;
            }
            
            .print-content-column {
              word-break: normal !important;
              overflow-wrap: break-word !important;
              white-space: normal !important;
            }
            
            /* Force sticky elements to be static for printing */
            .print-sticky-header {
              position: static !important;
              top: auto !important;
            }
            
            /* Force table body and rows to be visible */
            tbody, tr {
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
            }
            
            /* Remove any height constraints on the main container */
            [class*="h-full"],
            [class*="max-h-"],
            [class*="overflow-"] {
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
            }

            /* Hide showcaller indicators in print */
            .print-hide-showcaller {
              display: none !important;
            }
            
            /* Remove showcaller highlighting from current segment name in print */
            .showcaller-highlight {
              background: transparent !important;
              color: #000 !important;
            }

            /* Force black logo in print view */
            img[src*="376f4f6f-fa91-4af6-b8fd-8da723bdc3fa.png"] {
              content: url('/lovable-uploads/afb9e93f-aa34-4180-9c2a-5e154e539215.png') !important;
            }
          }
          
          /* Screen-only styles for showcaller highlighting */
          @media screen {
            .showcaller-highlight {
              background-color: #3b82f6 !important;
              color: #ffffff !important;
            }
          }
        `}
      </style>
      <div 
        className={`print-container border rounded-lg print:border-gray-400 print:overflow-visible print:h-auto print:max-h-none ${
          isDark ? 'border-gray-700 h-full print:h-auto' : 'border-gray-200 h-full print:h-auto'
        }`} 
        ref={ref}
      >
        <div className="print-scroll-container h-full overflow-auto print:overflow-visible print:h-auto print:max-h-none">
          <table className="w-full print:text-xs print-table table-fixed print:h-auto print:max-h-none">
            <thead className={`sticky top-0 z-10 print:static print-sticky-header ${
              isDark ? 'bg-gray-800' : 'bg-gray-50 print:bg-gray-100'
            }`}>
              <tr className="print-header-row">
                <th 
                  className={`px-2 py-1 text-center text-xs font-medium uppercase tracking-wider border-b print:border-gray-400 print-row-number ${
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
                      className={`px-2 py-1 text-left text-xs font-medium uppercase tracking-wider border-b print:border-gray-400 ${
                        isDark 
                          ? 'text-gray-300 border-gray-600 bg-gray-800' 
                          : 'text-gray-500 border-gray-200 bg-gray-50'
                      } ${
                        ['duration', 'startTime', 'endTime', 'elapsedTime'].includes(column.key) 
                          ? 'print-time-column' 
                          : 'print-content-column'
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
            <tbody className={`divide-y print:divide-gray-400 print:h-auto print:max-h-none print:overflow-visible ${
              isDark 
                ? 'bg-gray-900 divide-gray-700' 
                : 'bg-white divide-gray-200'
            }`}>
              {itemsWithTimes.map(({ item, calculatedStartTime }, index) => {
                const isShowcallerCurrent = item.type !== 'header' && currentSegmentId === item.id;
                const isCurrentlyPlaying = isShowcallerCurrent && isPlaying;
                const isFloated = item.isFloating || item.isFloated;
                const itemHasCustomColor = hasCustomColor(item);
                
                // Determine row background color and print class
                let rowBackgroundColor = undefined;
                let textColor = isDark ? '#ffffff' : '#000000'; // Default text colors
                let printRowClass = '';
                
                if (item.type === 'header') {
                  rowBackgroundColor = isDark ? '#374151' : '#f3f4f6'; // gray-700 : gray-100
                  printRowClass = 'print-header-row';
                } else if (isFloated) {
                  rowBackgroundColor = '#dc2626'; // red-600
                  textColor = '#ffffff';
                  printRowClass = 'print-floated-row';
                } else if (item.color && item.color !== '#ffffff' && item.color !== '#FFFFFF' && item.color !== '') {
                  rowBackgroundColor = item.color;
                  textColor = getContrastTextColor(item.color);
                  printRowClass = 'print-custom-colored-row';
                } else {
                  // Default row - don't preserve colors in print
                  printRowClass = 'print-default-row';
                }
                
                // Determine inline styles - only apply for custom colored rows
                const rowStyles: React.CSSProperties = {};
                if (itemHasCustomColor) {
                  rowStyles.backgroundColor = rowBackgroundColor;
                  rowStyles.color = textColor;
                  rowStyles.WebkitPrintColorAdjust = 'exact';
                  rowStyles.printColorAdjust = 'exact';
                }
                
                return (
                  <tr
                    key={item.id}
                    data-item-id={item.id}
                    className={`
                      ${item.type === 'header' ? 'font-semibold' : ''}
                      ${printRowClass}
                      print:break-inside-avoid print:border-0 print:h-auto print:max-h-none print:overflow-visible
                    `}
                    style={rowStyles}
                  >
                    <td 
                      className={`px-2 ${item.type === 'header' ? 'py-6' : 'py-1'} whitespace-nowrap text-sm border-r print:border-gray-400 print-row-number print:h-auto print:max-h-none print:overflow-visible ${
                        isDark ? 'border-gray-600' : 'border-gray-200'
                      }`}
                      style={{ 
                        width: '60px', 
                        minWidth: '60px', 
                        maxWidth: '60px',
                        ...(itemHasCustomColor ? {
                          backgroundColor: rowBackgroundColor,
                          color: textColor,
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact'
                        } : {})
                      }}
                    >
                      <div className="flex items-center justify-center">
                        {/* Blue play icon for current segment - hidden in print */}
                        {isShowcallerCurrent && (
                          <Play 
                            className="h-5 w-5 text-blue-500 fill-blue-500 mr-2 print-hide-showcaller" 
                          />
                        )}
                        {isFloated && (
                          <span className="text-yellow-400 mr-1 print:mr-0.5 print:text-yellow-600 print-hide-showcaller">🛟</span>
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
                          // Show the header name for both segmentName and name columns
                          return (
                            <td 
                              key={column.id} 
                              className={`px-2 py-1 text-sm border-r print:border-gray-400 print-content-column print:h-auto print:max-h-none print:overflow-visible ${
                                isDark ? 'border-gray-600' : 'border-gray-200'
                              }`}
                              style={{ 
                                width: columnWidth, 
                                minWidth: columnWidth, 
                                maxWidth: columnWidth,
                                ...(itemHasCustomColor ? {
                                  backgroundColor: rowBackgroundColor,
                                  color: textColor,
                                  WebkitPrintColorAdjust: 'exact',
                                  printColorAdjust: 'exact'
                                } : {})
                              }}
                            >
                              <div className="break-words whitespace-pre-wrap overflow-hidden">{item.name || ''}</div>
                            </td>
                          );
                        } else if (column.key === 'duration') {
                          // Show the calculated header duration (excluding floated items)
                          return (
                            <td 
                              key={column.id} 
                              className={`px-2 py-1 text-sm border-r print:border-gray-400 print-time-column print:h-auto print:max-h-none print:overflow-visible ${
                                isDark 
                                  ? 'text-gray-400 border-gray-600' 
                                  : 'text-gray-600 border-gray-200'
                              }`}
                              style={{ 
                                width: columnWidth, 
                                minWidth: columnWidth, 
                                maxWidth: columnWidth,
                                ...(itemHasCustomColor ? {
                                  backgroundColor: rowBackgroundColor,
                                  color: textColor,
                                  WebkitPrintColorAdjust: 'exact',
                                  printColorAdjust: 'exact'
                                } : {})
                              }}
                            >
                              <div className="break-words whitespace-pre-wrap overflow-hidden">({calculateHeaderDuration(index)})</div>
                            </td>
                          );
                        } else if (column.key === 'startTime' || column.key === 'endTime' || column.key === 'elapsedTime') {
                          // Don't show time fields for headers
                          return (
                            <td 
                              key={column.id} 
                              className={`px-2 py-1 text-sm border-r print:border-gray-400 print-time-column print:h-auto print:max-h-none print:overflow-visible ${
                                isDark ? 'border-gray-600' : 'border-gray-200'
                              }`}
                              style={{ 
                                width: columnWidth, 
                                minWidth: columnWidth, 
                                maxWidth: columnWidth,
                                ...(itemHasCustomColor ? {
                                  backgroundColor: rowBackgroundColor,
                                  color: textColor,
                                  WebkitPrintColorAdjust: 'exact',
                                  printColorAdjust: 'exact'
                                } : {})
                              }}
                            >
                              <div className="break-words whitespace-pre-wrap overflow-hidden"></div>
                            </td>
                          );
                        } else {
                          // For other columns, show empty cell for headers
                          return (
                            <td 
                              key={column.id} 
                              className={`px-2 py-1 text-sm border-r print:border-gray-400 print-content-column print:h-auto print:max-h-none print:overflow-visible ${
                                isDark ? 'border-gray-600' : 'border-gray-200'
                              }`}
                              style={{ 
                                width: columnWidth, 
                                minWidth: columnWidth, 
                                maxWidth: columnWidth,
                                ...(itemHasCustomColor ? {
                                  backgroundColor: rowBackgroundColor,
                                  color: textColor,
                                  WebkitPrintColorAdjust: 'exact',
                                  printColorAdjust: 'exact'
                                } : {})
                              }}
                            >
                              <div className="break-words whitespace-pre-wrap overflow-hidden"></div>
                            </td>
                          );
                        }
                      }
                      
                      // For regular items, render content with showcaller highlighting class
                      return (
                        <td
                          key={column.id}
                          className={`px-2 py-1 text-sm border-r print:border-gray-400 print:h-auto print:max-h-none print:overflow-visible ${
                            ['duration', 'startTime', 'endTime', 'elapsedTime'].includes(column.key) 
                              ? 'print-time-column' 
                              : 'print-content-column'
                          } ${isDark ? 'border-gray-600' : 'border-gray-200'} ${
                            isCurrentSegmentName ? 'showcaller-highlight' : ''
                          }`}
                          style={{ 
                            width: columnWidth, 
                            minWidth: columnWidth, 
                            maxWidth: columnWidth,
                            ...(itemHasCustomColor && !isCurrentSegmentName ? {
                              backgroundColor: rowBackgroundColor,
                              color: textColor,
                              WebkitPrintColorAdjust: 'exact',
                              printColorAdjust: 'exact'
                            } : {})
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
    </>
  );
});

SharedRundownTable.displayName = 'SharedRundownTable';

export default SharedRundownTable;
