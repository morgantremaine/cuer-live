import React, { forwardRef, useState } from 'react';
import { RundownItem } from '@/types/rundown';
import { getRowNumber, getCellValue } from '@/utils/sharedRundownUtils';
import { getContrastTextColor } from '@/utils/colorUtils';
import { renderScriptWithBrackets, isNullScript } from '@/utils/scriptUtils';
import { renderTextWithClickableUrls } from '@/utils/urlUtils';
import { Play, ChevronDown, ChevronRight, ExternalLink, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SharedRundownTableProps {
  items: RundownItem[];
  visibleColumns: any[];
  currentSegmentId: string | null;
  isPlaying?: boolean;
  rundownStartTime?: string;
  isDark?: boolean;
  onReorderColumns?: (newColumns: any[]) => void;
}

// Draggable column header component
const DraggableColumnHeader = ({ 
  column, 
  index, 
  isDark, 
  columnExpandState, 
  toggleColumnExpand,
  getColumnWidth 
}: {
  column: any;
  index: number;
  isDark: boolean;
  columnExpandState: { [key: string]: boolean };
  toggleColumnExpand: (key: string) => void;
  getColumnWidth: (column: any) => string;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const columnWidth = getColumnWidth(column);

  return (
    <th
      ref={setNodeRef}
      style={{...style, width: columnWidth, minWidth: columnWidth, maxWidth: columnWidth }}
      className={`px-2 py-1 text-left text-xs font-medium uppercase tracking-wider border-b border-r print:border-gray-400 cursor-grab active:cursor-grabbing text-white bg-blue-600 border-blue-700 ${
        ['duration', 'startTime', 'endTime', 'elapsedTime'].includes(column.key) 
          ? 'print-time-column' 
          : 'print-content-column'
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center space-x-1">
        {(column.key === 'script' || column.key === 'notes') && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleColumnExpand(column.key);
            }}
            className={`flex-shrink-0 p-0.5 rounded transition-colors print:hidden hover:bg-blue-500 text-blue-100 hover:text-white`}
            title={columnExpandState[column.key] ? 'Collapse all' : 'Expand all'}
          >
            {columnExpandState[column.key] ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}
        <span className="truncate">
          {column.name}
        </span>
      </div>
    </th>
  );
};

const SharedRundownTable = forwardRef<HTMLDivElement, SharedRundownTableProps>(({ 
  items, 
  visibleColumns, 
  currentSegmentId, 
  isPlaying = false,
  rundownStartTime = '09:00:00',
  isDark = false,
  onReorderColumns
}, ref) => {
  // State for active dragged column
  const [activeColumn, setActiveColumn] = useState<any | null>(null);
  
  // Set up drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum distance before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag start event
  const handleDragStart = (event: DragStartEvent) => {
    const column = visibleColumns.find(col => col.id === event.active.id);
    setActiveColumn(column || null);
  };

  // Handle drag end event
  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id && onReorderColumns) {
      const oldIndex = visibleColumns.findIndex(col => col.id === active.id);
      const newIndex = visibleColumns.findIndex(col => col.id === over.id);
      const newColumns = arrayMove(visibleColumns, oldIndex, newIndex);
      onReorderColumns(newColumns);
    }
    
    setActiveColumn(null);
  };
  // State for managing expanded script/notes cells
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set());
  // State for managing collapsed headers
  const [collapsedHeaders, setCollapsedHeaders] = useState<Set<string>>(new Set());
  // State for managing column expand state (expand all cells in a column)
  const [columnExpandState, setColumnExpandState] = useState<{ [columnKey: string]: boolean }>({});
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

  // Helper function to convert Dropbox links to direct image URLs
  const convertDropboxUrl = (url: string): string => {
    // Check if it's a Dropbox sharing link
    if (url.includes('dropbox.com') && url.includes('dl=0')) {
      // Convert from sharing link to direct download by changing dl=0 to dl=1
      return url.replace('dl=0', 'dl=1');
    }
    
    // Check for Dropbox scl format and convert to direct link
    if (url.includes('dropbox.com/scl/')) {
      return url.replace('dl=0', 'dl=1');
    }
    
    return url;
  };

  // Helper function to extract Figma project name from URL
  const getFigmaProjectName = (url: string): string => {
    try {
      // Figma URL pattern: https://www.figma.com/design/{file-id}/{file-name}?query-params
      const urlPath = new URL(url).pathname;
      const pathParts = urlPath.split('/');
      
      // Find the file name part (usually after /design/{file-id}/)
      if (pathParts.length >= 4 && pathParts[1] === 'design') {
        const fileName = pathParts[3];
        // Decode URL encoding and replace dashes/underscores with spaces
        return decodeURIComponent(fileName)
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
      }
    } catch (error) {
      // If URL parsing fails, return default
    }
    
    return 'Figma Design';
  };

  // Helper function to extract Google Drive folder/file name from URL
  const getGoogleDriveName = (url: string): string => {
    try {
      const urlObj = new URL(url);
      
      // Check if it's a folder
      if (url.includes('/folders/')) {
        return 'Google Drive Folder';
      }
      
      // Check if it's a file
      if (url.includes('/file/d/')) {
        return 'Google Drive File';
      }
      
      // Try to extract name from search params or path
      const searchParams = urlObj.searchParams;
      if (searchParams.has('usp')) {
        return 'Google Drive Item';
      }
      
    } catch (error) {
      // If URL parsing fails, return default
    }
    
    return 'Google Drive';
  };

  // Helper function to extract Google Docs document name from URL
  const getGoogleDocsName = (url: string): string => {
    try {
      // Google Docs URL pattern: https://docs.google.com/document/d/{doc-id}/edit?...
      if (url.includes('docs.google.com/document/')) {
        return 'Google Doc';
      }
      
      // Google Sheets URL pattern: https://docs.google.com/spreadsheets/d/{sheet-id}/edit?...
      if (url.includes('docs.google.com/spreadsheets/')) {
        return 'Google Sheet';
      }
      
      // Google Slides URL pattern: https://docs.google.com/presentation/d/{presentation-id}/edit?...
      if (url.includes('docs.google.com/presentation/')) {
        return 'Google Slides';
      }
      
      // Generic Google Docs
      if (url.includes('docs.google.com/')) {
        return 'Google Docs';
      }
      
    } catch (error) {
      // If URL parsing fails, return default
    }
    
    return 'Google Docs';
  };

  // Helper function to get Google Docs thumbnail URL
  const getGoogleDocsThumbnail = (url: string): string | null => {
    try {
      let docId = null;
      
      // Extract document ID from different Google Docs URL formats
      if (url.includes('docs.google.com/document/d/')) {
        const docMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
        if (docMatch) {
          docId = docMatch[1];
          return `https://docs.google.com/document/d/${docId}/preview`;
        }
      }
      
      if (url.includes('docs.google.com/spreadsheets/d/')) {
        const sheetMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
        if (sheetMatch) {
          docId = sheetMatch[1];
          return `https://docs.google.com/spreadsheets/d/${docId}/preview`;
        }
      }
      
      if (url.includes('docs.google.com/presentation/d/')) {
        const slideMatch = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
        if (slideMatch) {
          docId = slideMatch[1];
          return `https://docs.google.com/presentation/d/${docId}/preview`;
        }
      }
      
    } catch (error) {
      // If URL parsing fails, return null
    }
    
    return null;
  };

  // Helper function to check if a URL is likely an image
  const isLikelyImageUrl = (url: string): boolean => {
    if (!url || !url.trim()) return false;
    
    // Check if it's a Google Drive file/folder (but not an image) first
    const isGoogleDriveFile = url.includes('drive.google.com') && 
      (url.includes('/folders/') || url.includes('/file/d/'));
    
    // Check if it's a Google Docs file
    const isGoogleDocsFile = url.includes('docs.google.com/');
    
    // Exclude Google Drive folders/files and Google Docs from image detection
    if (isGoogleDriveFile || isGoogleDocsFile) {
      return false;
    }
    
    return (
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url) ||
      /\.(jpg|jpeg|png|gif|webp|svg)\?/i.test(url) ||
      url.includes('images') ||
      url.includes('photos') ||
      url.includes('imgur') ||
      url.includes('unsplash') ||
      (url.includes('drive.google.com') && /\.(jpg|jpeg|png|gif|webp|svg)/i.test(url)) ||
      url.includes('dropbox.com') ||
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

  // Get the display URL (convert Google Drive or Dropbox links if necessary)
  const getDisplayUrl = (url: string): string => {
    if (url.includes('drive.google.com')) {
      return convertGoogleDriveUrl(url);
    } else if (url.includes('dropbox.com')) {
      return convertDropboxUrl(url);
    }
    return url;
  };

  // Helper function to get column width - use saved layout width when available
  const getColumnWidth = (column: any): string => {
    // Use the saved width from the layout if available
    if (column.width) {
      return column.width;
    }
    
    // Fallback to default widths for backward compatibility
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

  // Helper function to toggle column expand state (expand/collapse all cells in a column)
  const toggleColumnExpand = (columnKey: string) => {
    // Store the current scroll position and active element
    const currentScrollTop = window.scrollY;
    const currentActiveElement = document.activeElement;
    
    const newState = !columnExpandState[columnKey];
    setColumnExpandState(prev => ({ ...prev, [columnKey]: newState }));
    
    // Apply to all items
    setExpandedCells(prev => {
      const newSet = new Set(prev);
      items.forEach(item => {
        const cellKey = `${item.id}-${columnKey}`;
        if (newState) {
          newSet.add(cellKey);
        } else {
          newSet.delete(cellKey);
        }
      });
      return newSet;
    });

    // Restore scroll position and focus after state updates
    requestAnimationFrame(() => {
      // Restore the scroll position
      window.scrollTo(0, currentScrollTop);
      
      // If there was an active element that's still in the DOM and focusable, restore focus
      if (currentActiveElement && 
          document.contains(currentActiveElement) && 
          currentActiveElement instanceof HTMLElement &&
          currentActiveElement.tabIndex >= 0) {
        currentActiveElement.focus();
      }
    });
  };

  // Helper function to toggle header collapse state
  const toggleHeaderCollapse = (headerId: string) => {
    setCollapsedHeaders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(headerId)) {
        newSet.delete(headerId);
      } else {
        newSet.add(headerId);
      }
      return newSet;
    });
  };

  // Helper function to check if a header is collapsed
  const isHeaderCollapsed = (headerId: string): boolean => {
    return collapsedHeaders.has(headerId);
  };

  // Toggle all header groups expand/collapse state
  const handleToggleAllHeaders = () => {
    // Find all headers in the items
    const headerItems = items.filter(item => item.type === 'header');
    
    if (headerItems.length === 0) return;
    
    // Check if any headers are currently collapsed
    const hasCollapsedHeaders = headerItems.some(header => isHeaderCollapsed(header.id));
    
    // If any headers are collapsed, expand all. If all are expanded, collapse all.
    headerItems.forEach(header => {
      const isCurrentlyCollapsed = isHeaderCollapsed(header.id);
      
      if (hasCollapsedHeaders && isCurrentlyCollapsed) {
        // Expand this collapsed header
        toggleHeaderCollapse(header.id);
      } else if (!hasCollapsedHeaders && !isCurrentlyCollapsed) {
        // Collapse this expanded header
        toggleHeaderCollapse(header.id);
      }
    });
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
                  renderScriptWithBrackets(value, { inlineDisplay: false, fontSize: 14, showNullAsText: true }) : 
                  renderTextWithClickableUrls(value)
                }
              </div>
            ) : (
              <div className="truncate text-sm" title={value}>
                {columnKey === 'script' ? 
                  renderScriptWithBrackets(value, { inlineDisplay: true, fontSize: 14, showNullAsText: true }) : 
                  renderTextWithClickableUrls(value)
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
    
    // Special handling for images column
    if ((column.key === 'images' || column.id === 'images') && value && value.trim()) {
      // Check if it's a Google Drive file/folder (but not an image) first
      const isGoogleDriveFile = value.includes('drive.google.com') && 
        (value.includes('/folders/') || value.includes('/file/d/'));
      
      // Check if it's a Google Docs file
      const isGoogleDocsFile = value.includes('docs.google.com/');
      
      // Check if it's a Figma design file
      const isFigmaFile = value.includes('figma.com');
      
      // Check if it looks like an image URL (but exclude Google Drive folders/files and Google Docs)
      const isLikelyImage = isLikelyImageUrl(value);
      
      if (isLikelyImage) {
        const displayUrl = getDisplayUrl(value);
        return (
          <div className="flex items-center justify-center h-16">
            <img
              src={displayUrl}
              alt="Rundown image"
              className="max-w-16 max-h-16 object-contain rounded print:max-w-12 print:max-h-12"
              onError={(e) => {
                // If image fails to load, show "Invalid image URL"
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `<span class="text-xs text-gray-500">Invalid image URL</span>`;
                }
              }}
            />
          </div>
        );
      } else if (isFigmaFile) {
        return (
          <div className="w-full min-h-[32px] max-h-12 flex items-center justify-between bg-gray-100 rounded border border-gray-300 p-1 overflow-hidden">
            <div className="flex items-center space-x-1 text-gray-700 min-w-0 flex-1">
              <div className="w-3 h-3 bg-purple-500 rounded flex items-center justify-center text-white font-bold text-[8px] flex-shrink-0">
                F
              </div>
              <span className="text-xs font-medium truncate">{getFigmaProjectName(value)}</span>
            </div>
            <ExternalLink className="h-2 w-2 text-gray-600 flex-shrink-0 ml-1" />
          </div>
        );
      } else if (isGoogleDriveFile) {
        return (
          <div className="w-full min-h-[32px] max-h-12 flex items-center justify-between bg-blue-50 rounded border border-blue-200 p-1 overflow-hidden">
            <div className="flex items-center space-x-1 text-blue-700 min-w-0 flex-1">
              <div className="w-3 h-3 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-[8px] flex-shrink-0">
                G
              </div>
              <span className="text-xs font-medium truncate">{getGoogleDriveName(value)}</span>
            </div>
            <ExternalLink className="h-2 w-2 text-blue-600 flex-shrink-0 ml-1" />
          </div>
        );
      } else if (isGoogleDocsFile) {
        const thumbnailUrl = getGoogleDocsThumbnail(value);
        
        if (thumbnailUrl) {
          return (
            <div className="w-full h-auto flex flex-col space-y-1">
              <img
                src={thumbnailUrl}
                alt={getGoogleDocsName(value)}
                className="w-full h-auto object-contain rounded border border-green-200"
                onError={(e) => {
                  // If thumbnail fails to load, fall back to card view
                  const target = e.target as HTMLImageElement;
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="w-full min-h-[32px] max-h-12 flex items-center justify-between bg-green-50 rounded border border-green-200 p-1 overflow-hidden">
                        <div class="flex items-center space-x-1 text-green-700 min-w-0 flex-1">
                          <div class="w-3 h-3 bg-green-500 rounded flex items-center justify-center text-white font-bold text-[8px] flex-shrink-0">
                            D
                          </div>
                          <span class="text-xs font-medium truncate">${getGoogleDocsName(value)}</span>
                        </div>
                      </div>
                    `;
                  }
                }}
                style={{ 
                  maxHeight: '80px',
                }}
              />
              <div className="flex items-center justify-between text-xs text-green-700">
                <span className="truncate">{getGoogleDocsName(value)}</span>
                <ExternalLink className="h-2 w-2 flex-shrink-0 ml-1" />
              </div>
            </div>
          );
        } else {
          return (
            <div className="w-full min-h-[32px] max-h-12 flex items-center justify-between bg-green-50 rounded border border-green-200 p-1 overflow-hidden">
              <div className="flex items-center space-x-1 text-green-700 min-w-0 flex-1">
                <div className="w-3 h-3 bg-green-500 rounded flex items-center justify-center text-white font-bold text-[8px] flex-shrink-0">
                  D
                </div>
                <span className="text-xs font-medium truncate">{getGoogleDocsName(value)}</span>
              </div>
              <ExternalLink className="h-2 w-2 text-green-600 flex-shrink-0 ml-1" />
            </div>
          );
        }
      } else {
        // For any other content in images column, show "Invalid image URL"
        return (
          <div className="w-full min-h-8 flex items-center text-xs text-gray-500">
            Invalid image URL
          </div>
        );
      }
    }
    
    // Use expandable cell for script and notes columns
    if (column.key === 'script' || column.key === 'notes') {
      return renderExpandableCell(value, item.id, column.key);
    }
    
    // For all other text content, render with clickable URLs
    return renderTextWithClickableUrls(value);
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
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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
              table-layout: fixed !important;
              font-size: 9px !important;
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
              padding: 8px 4px !important;
              height: 40px !important;
              font-size: 9px !important;
              font-weight: bold !important;
              background: #f0f0f0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color: #000 !important;
            }
            
            .print-header-row {
              background: #f5f5f5 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            .print-header-row td {
              background: #f5f5f5 !important;
              color: #000 !important;
              font-weight: bold !important;
              border-left: none !important;
              border-right: none !important;
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
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
            
            /* Force script columns to wrap text in print */
            .print-content-column .truncate {
              white-space: normal !important;
              overflow: visible !important;
              text-overflow: clip !important;
            }
            
            /* Ensure script content doesn't get cut off */
            .print-content-column div {
              white-space: pre-wrap !important;
              word-break: break-word !important;
              overflow-wrap: break-word !important;
            }
            
            /* Force sticky elements to be static for printing */
            .print-sticky-header {
              position: static !important;
              top: auto !important;
            }
            
            /* Auto-resize table to fit page */
            .print-table {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            
            tbody tr {
              height: auto !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            
            .print-table td {
              font-size: 8px !important;
              padding: 2px 3px !important;
              line-height: 1.2 !important;
              height: auto !important;
              vertical-align: top !important;
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
            
            /* Hide screen-only duration in print */
            .screen-only-duration {
              display: none !important;
            }
            
            /* Remove showcaller highlighting from current segment name in print */
            .showcaller-highlight {
              background: transparent !important;
              color: #000 !important;
            }

            /* Force black logo in print view */
            img[src*="376f4f6f-fa91-4af6-b8fd-8da723bdc3fa.png"] {
              content: url('/uploads/afb9e93f-aa34-4180-9c2a-5e154e539215.png') !important;
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
                  className={`px-2 py-1 text-center text-xs font-medium uppercase tracking-wider border-b border-r print:border-gray-400 print-row-number text-white bg-blue-600 border-blue-700`}
                  style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}
                >
                  <div className="flex items-center justify-center space-x-1">
                    {items.some(item => item.type === 'header') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleAllHeaders();
                        }}
                        className={`flex-shrink-0 p-0.5 rounded transition-colors print:hidden hover:bg-blue-500 text-blue-100 hover:text-white`}
                        title="Toggle all header groups"
                      >
                        {items.filter(item => item.type === 'header').some(header => isHeaderCollapsed(header.id)) ? (
                          <ChevronRight className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>
                    )}
                    <span>#</span>
                  </div>
                </th>
                
                <SortableContext items={visibleColumns.map(col => col.id)} strategy={horizontalListSortingStrategy}>
                  {visibleColumns.map((column, index) => (
                    <DraggableColumnHeader
                      key={column.id}
                      column={column}
                      index={index}
                      isDark={isDark}
                      columnExpandState={columnExpandState}
                      toggleColumnExpand={toggleColumnExpand}
                      getColumnWidth={getColumnWidth}
                    />
                  ))}
                </SortableContext>
              </tr>
            </thead>
            <tbody className={`divide-y print:divide-gray-400 print:h-auto print:max-h-none print:overflow-visible ${
              isDark 
                ? 'bg-gray-900 divide-gray-700' 
                : 'bg-white divide-gray-200'
            }`}>
              {itemsWithTimes.filter(({ item }, index) => {
                // Always show headers
                if (item.type === 'header') return true;
                
                // Check if this item should be hidden due to a collapsed header
                // Find the header this item belongs to
                let headerIndex = -1;
                for (let i = index - 1; i >= 0; i--) {
                  if (itemsWithTimes[i].item.type === 'header') {
                    headerIndex = i;
                    break;
                  }
                }
                
                // If we found a header and it's collapsed, hide this item
                if (headerIndex >= 0 && isHeaderCollapsed(itemsWithTimes[headerIndex].item.id)) {
                  return false;
                }
                
                return true;
              }).map(({ item, calculatedStartTime }, filteredIndex) => {
                // We need to find the original index for this item
                const originalIndex = itemsWithTimes.findIndex(({ item: originalItem }) => originalItem.id === item.id);
                const isShowcallerCurrent = item.type !== 'header' && currentSegmentId === item.id;
                const isCurrentlyPlaying = isPlaying;
                const isFloated = item.isFloating || item.isFloated;
                const itemHasCustomColor = hasCustomColor(item);
                
                // Determine row background color and print class
                let rowBackgroundColor = undefined;
                let textColor = isDark ? '#ffffff' : '#000000'; // Default text colors
                let printRowClass = '';
                
                if (isFloated) {
                  rowBackgroundColor = '#dc2626'; // red-600
                  textColor = '#ffffff';
                  printRowClass = 'print-floated-row';
                } else if (item.color && item.color !== '#ffffff' && item.color !== '#FFFFFF' && item.color !== '') {
                  // Custom color takes priority over header defaults
                  rowBackgroundColor = item.color;
                  textColor = getContrastTextColor(item.color);
                  printRowClass = 'print-custom-colored-row';
                } else if (item.type === 'header') {
                  // Default header color only if no custom color is set
                  rowBackgroundColor = isDark ? '#374151' : '#f3f4f6'; // gray-700 : gray-100
                  printRowClass = 'print-header-row';
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
                      className={`px-2 ${item.type === 'header' ? 'py-6' : 'py-2'} whitespace-nowrap text-sm ${item.type === 'header' ? '' : 'border-r'} print:border-gray-400 print-row-number print:h-auto print:max-h-none print:overflow-visible bg-background ${
                        isDark ? 'border-border' : 'border-gray-200'
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
                        <span>{getRowNumber(originalIndex, items)}</span>
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
                           // Show the header name with collapse button and duration - first column only
                           const isCollapsed = isHeaderCollapsed(item.id);
                           const isFirstNameColumn = visibleColumns.findIndex(col => col.key === 'segmentName' || col.key === 'name') === visibleColumns.findIndex(col => col.id === column.id);
                           
                           if (isFirstNameColumn) {
                             const headerDuration = calculateHeaderDuration(originalIndex);
                             return (
                               <td 
                                 key={column.id} 
                                 className={`px-2 py-6 text-lg font-bold print-content-column print:h-auto print:max-h-none print:overflow-visible`}
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
                                  <div className="flex items-center gap-2 w-full min-w-0">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleHeaderCollapse(item.id);
                                      }}
                                      className={`flex-shrink-0 p-1 rounded transition-colors print:hidden ${
                                        isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300' : 'hover:bg-gray-200 text-gray-600 hover:text-gray-800'
                                      }`}
                                      title={isCollapsed ? 'Expand header' : 'Collapse header'}
                                    >
                                      {isCollapsed ? (
                                        <ChevronRight className="h-4 w-4" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4" />
                                      )}
                                    </button>
                                     {/* Header name - show duration inline on screen, only name in print */}
                                     <div className="flex items-center gap-6 min-w-0 flex-1">
                                       <span className="text-lg font-bold whitespace-nowrap print:whitespace-normal print:break-words">{item.name || ''}</span>
                                       <span className="text-base font-medium whitespace-nowrap flex-shrink-0 screen-only-duration">({headerDuration})</span>
                                     </div>
                                  </div>
                               </td>
                             );
                           } else {
                             // Empty cell for other name columns
                             return (
                               <td 
                                 key={column.id} 
                                 className={`px-2 py-6 print-content-column print:h-auto print:max-h-none print:overflow-visible`}
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
                               </td>
                             );
                           }
                        } else if (column.key === 'duration') {
                          // Show duration in print only, hidden on screen since it's now part of header name
                          return (
                            <td 
                              key={column.id} 
                              className={`px-2 py-6 text-sm print-time-column print:h-auto print:max-h-none print:overflow-visible`}
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
                              <div className="hidden print:block font-medium">
                                {calculateHeaderDuration(originalIndex)}
                              </div>
                            </td>
                          );
                        } else if (column.key === 'startTime' || column.key === 'endTime' || column.key === 'elapsedTime') {
                          // Don't show time fields for headers - empty cells
                          return (
                            <td 
                              key={column.id} 
                              className={`px-2 py-6 text-sm print-time-column print:h-auto print:max-h-none print:overflow-visible`}
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
                            </td>
                          );
                        } else {
                          // For other columns, show empty cell for headers
                          return (
                            <td 
                              key={column.id} 
                              className={`px-2 py-6 text-sm print-content-column print:h-auto print:max-h-none print:overflow-visible`}
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
                            </td>
                          );
                        }
                      }
                      
                      // For regular items, render content with showcaller highlighting class
                      return (
                        <td
                          key={column.id}
                          className={`px-2 py-2 text-sm border-r print:border-gray-400 print:h-auto print:max-h-none print:overflow-visible bg-background ${
                            ['duration', 'startTime', 'endTime', 'elapsedTime'].includes(column.key) 
                              ? 'print-time-column' 
                              : 'print-content-column'
                          } ${isDark ? 'border-border' : 'border-gray-200'} ${
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
                            {(column.key === 'script' || column.key === 'notes') ? 
                              renderExpandableCell(getCellValue(item, column, rundownStartTime, calculatedStartTime), item.id, column.key) ||
                              <div>{renderCellContent(item, column, calculatedStartTime)}</div> :
                              renderCellContent(item, column, calculatedStartTime)
                            }
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
      
      <DragOverlay>
        {activeColumn ? (
          <th 
            className={`px-2 py-1 text-left text-xs font-medium uppercase tracking-wider border-b border-r text-white bg-blue-600 border-blue-700`}
            style={{ 
              width: getColumnWidth(activeColumn),
              minWidth: getColumnWidth(activeColumn),
              maxWidth: getColumnWidth(activeColumn),
              opacity: 0.9,
              zIndex: 1000
            }}
          >
            <div 
              className="truncate overflow-hidden text-ellipsis whitespace-nowrap"
              style={{
                width: `${parseInt(getColumnWidth(activeColumn)) - 16}px`,
                minWidth: `${parseInt(getColumnWidth(activeColumn)) - 16}px`,
                maxWidth: `${parseInt(getColumnWidth(activeColumn)) - 16}px`
              }}
            >
              {activeColumn.name}
            </div>
          </th>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
});

SharedRundownTable.displayName = 'SharedRundownTable';

export default SharedRundownTable;
