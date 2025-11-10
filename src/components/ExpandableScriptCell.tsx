import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { renderScriptWithBrackets, isNullScript } from '@/utils/scriptUtils';
import { renderTextWithClickableUrls } from '@/utils/urlUtils';
import { useDebouncedInput } from '@/hooks/useDebouncedInput';

interface ExpandableScriptCellProps {
  value: string;
  itemId: string;
  cellRefKey: string;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor?: string;
  columnExpanded?: boolean;
  fieldType?: 'script' | 'notes';
  isExpanded?: boolean; // NEW: externally managed expanded state
  onToggleExpanded?: () => void; // NEW: toggle callback
  onUpdateValue: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
}

const ExpandableScriptCell = ({
  value,
  itemId,
  cellRefKey,
  cellRefs,
  textColor,
  columnExpanded = false,
  fieldType = 'script',
  isExpanded: externalIsExpanded,
  onToggleExpanded,
  onUpdateValue,
  onKeyDown
}: ExpandableScriptCellProps) => {
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [rowHeight, setRowHeight] = useState<number>(0);
  const [showOverlay, setShowOverlay] = useState(true);
  const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const heightCalcTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Debounced input handling - immediate UI updates, batched parent updates
  const debouncedValue = useDebouncedInput(
    value,
    (newValue) => onUpdateValue(newValue),
    150 // 150ms delay matches other cells
  );
  
  // Create the proper cell ref key
  const cellKey = `${itemId}-${cellRefKey}`;
  
  // Use external state if provided, otherwise use internal state
  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;
  const effectiveExpanded = isExpanded;
  
  // Sync with column expanded state changes but maintain local control
  useEffect(() => {
    if (columnExpanded !== undefined && externalIsExpanded === undefined) {
      setInternalIsExpanded(columnExpanded);
    }
  }, [columnExpanded, externalIsExpanded]);

  // Track scroll events to prevent focus-during-scroll expansion
  useEffect(() => {
    const handleScroll = () => {
      lastScrollTimeRef.current = Date.now();
      setIsScrolling(true);
      
      // Debounce: mark scrolling as stopped after 200ms
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 200);
    };
    
    // Listen to both window scroll and container scroll
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    
    // Also listen to the table container scroll
    const tableContainer = containerRef.current?.closest('.overflow-auto');
    if (tableContainer) {
      tableContainer.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    return () => {
      clearTimeout(scrollTimeoutRef.current);
      window.removeEventListener('scroll', handleScroll, { capture: true });
      if (tableContainer) {
        tableContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  // Clear row height when expanded to prevent stale ResizeObserver measurements
  useEffect(() => {
    if (effectiveExpanded) {
      setRowHeight(0);
    }
  }, [effectiveExpanded]);

  // Auto-focus the real textarea only when expanded via tab navigation (shouldAutoFocus = true)
  useEffect(() => {
    if (effectiveExpanded && shouldAutoFocus) {
      // Use a slight delay to ensure the expanded textarea is rendered
      const timer = setTimeout(() => {
        // Try to focus the textareaRef first, then fallback to cellRefs
        if (textareaRef.current) {
          textareaRef.current.focus();
        } else if (cellRefs.current[cellKey]) {
          const element = cellRefs.current[cellKey];
          if (element instanceof HTMLTextAreaElement) {
            element.focus();
          }
        }
        // Reset the auto-focus flag after focusing
        setShouldAutoFocus(false);
      }, 50); // Increased delay to ensure DOM update
      return () => clearTimeout(timer);
    }
  }, [effectiveExpanded, shouldAutoFocus, cellKey]);

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Use external toggle if provided, otherwise use internal state
    if (onToggleExpanded) {
      onToggleExpanded();
    } else {
      setInternalIsExpanded(!internalIsExpanded);
    }
  };

  // Handle clicking to focus the textarea (no separate edit mode)
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row selection when clicking to edit
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Simple height calculation with debouncing
  const adjustHeight = () => {
    if (!textareaRef.current) return;
    
    // Reset height to auto to get accurate scrollHeight
    textareaRef.current.style.height = 'auto';
    const scrollHeight = textareaRef.current.scrollHeight;
    textareaRef.current.style.height = `${Math.max(scrollHeight, 24)}px`;
  };

  // Debounced height recalculation - only after typing stops
  useEffect(() => {
    clearTimeout(heightCalcTimeoutRef.current);
    heightCalcTimeoutRef.current = setTimeout(() => {
      adjustHeight();
    }, 100); // 100ms debounce
    return () => clearTimeout(heightCalcTimeoutRef.current);
  }, [debouncedValue.value]);

  // Adjust height on mount and expansion
  useEffect(() => {
    if (effectiveExpanded) {
      adjustHeight();
    }
  }, [effectiveExpanded]);

  // Get the appropriate focus styles for colored rows in dark mode
  const getFocusStyles = () => {
    // Check if textColor is set (indicating a colored row)
    const hasCustomColor = textColor && textColor !== '';
    
    if (hasCustomColor) {
      // For colored rows, force white text on focus in dark mode and black in light mode
      return 'focus:bg-white dark:focus:bg-gray-800 focus:!text-gray-900 dark:focus:!text-white';
    } else {
      // For normal rows, use standard focus styles
      return 'focus:bg-white dark:focus:bg-gray-700';
    }
  };

  const focusStyles = getFocusStyles();

  // Helper function to check if cursor is at visual line boundaries
  const isAtVisualBoundary = (textarea: HTMLTextAreaElement, direction: 'up' | 'down'): boolean => {
    const cursorPosition = textarea.selectionStart;
    const textValue = textarea.value;
    
    // Save current selection
    const originalStart = textarea.selectionStart;
    const originalEnd = textarea.selectionEnd;
    
    // Create a temporary div to measure text layout
    const measureDiv = document.createElement('div');
    measureDiv.style.cssText = window.getComputedStyle(textarea).cssText;
    measureDiv.style.position = 'absolute';
    measureDiv.style.visibility = 'hidden';
    measureDiv.style.height = 'auto';
    measureDiv.style.width = textarea.clientWidth + 'px';
    measureDiv.style.whiteSpace = 'pre-wrap';
    measureDiv.style.wordWrap = 'break-word';
    measureDiv.style.overflow = 'hidden';
    document.body.appendChild(measureDiv);
    
    try {
      // Get the line height
      const computedStyle = window.getComputedStyle(textarea);
      const lineHeight = parseInt(computedStyle.lineHeight) || parseInt(computedStyle.fontSize) * 1.2;
      
      if (direction === 'up') {
        // Check if cursor is in the first visual line
        const textBeforeCursor = textValue.substring(0, cursorPosition);
        measureDiv.textContent = textBeforeCursor;
        const heightBeforeCursor = measureDiv.scrollHeight;
        const linesBeforeCursor = Math.floor(heightBeforeCursor / lineHeight);
        
        // If we're in the first line (0-indexed), we're at the top boundary
        return linesBeforeCursor === 0;
      } else {
        // Check if cursor is in the last visual line
        const textAfterCursor = textValue.substring(cursorPosition);
        measureDiv.textContent = textAfterCursor;
        const heightAfterCursor = measureDiv.scrollHeight;
        
        // If there's minimal content after cursor (less than one line), we're at bottom
        return heightAfterCursor <= lineHeight;
      }
    } finally {
      document.body.removeChild(measureDiv);
      // Restore original selection
      textarea.setSelectionRange(originalStart, originalEnd);
    }
  };

  // Enhanced key navigation for script cells with proper visual line detection
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // For Up/Down arrows, check if we can still navigate within the text
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const textarea = e.target as HTMLTextAreaElement;
      
      // Check if we're at a visual boundary (first/last line)
      const atBoundary = isAtVisualBoundary(textarea, e.key === 'ArrowUp' ? 'up' : 'down');
      
      if (atBoundary) {
        // We're at a visual boundary, allow navigation to previous/next cell
        onKeyDown(e, itemId, cellRefKey);
        return;
      }
      
      // Otherwise, let the textarea handle the arrow key naturally (navigate within text)
      return;
    }
    
    // For Enter key, always allow it to create new lines (don't call onKeyDown)
    if (e.key === 'Enter') {
      return;
    }
    
    // For Tab key, allow standard navigation
    if (e.key === 'Tab') {
      onKeyDown(e, itemId, cellRefKey);
      return;
    }
    
    // For other navigation keys, let textarea handle them
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      return;
    }
  };

  // Monitor row height changes for dynamic preview sizing
  useEffect(() => {
    if (!effectiveExpanded && containerRef.current) {
      let timeoutId: NodeJS.Timeout;
      
      const updateRowHeight = () => {
        const row = containerRef.current?.closest('tr');
        if (row) {
          // Debounce height updates to prevent scroll jumps during scrolling
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            const height = row.offsetHeight;
            setRowHeight(height);
          }, 100);
        }
      };

      // Initial measurement
      updateRowHeight();

      // Use ResizeObserver to monitor row height changes
      const observer = new ResizeObserver(updateRowHeight);
      const row = containerRef.current?.closest('tr');
      if (row) {
        observer.observe(row);
      }

      return () => {
        clearTimeout(timeoutId);
        observer.disconnect();
      };
    }
  }, [effectiveExpanded, value]);

  // Calculate dynamic line clamp based on row height
  const getDynamicLineClamp = () => {
    if (rowHeight === 0) return 1; // Default fallback
    
    const lineHeight = 20; // 1.25rem (20px) as specified in the styling
    const padding = 16; // Account for py-1 (8px top + 8px bottom)
    const availableHeight = rowHeight - padding;
    const maxLines = Math.max(1, Math.floor(availableHeight / lineHeight));
    
    return maxLines;
  };

  return (
    <div ref={containerRef} className="flex items-start space-x-1 w-full expandable-script-cell overflow-hidden">
      <button
        onClick={toggleExpanded}
        className="flex-shrink-0 mt-1 p-1 rounded transition-colors hover:bg-gray-200 dark:hover:bg-gray-600"
        title={effectiveExpanded ? 'Collapse' : 'Expand'}
      >
        {effectiveExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        )}
      </button>
      <div className="flex-1 relative min-w-0">
        {/* When expanded: hybrid approach with functional textarea and styled overlay */}
        {effectiveExpanded && (
          <div className="relative">
            {/* Functional textarea (transparent when overlay is visible) */}
            <textarea
                ref={(el) => {
                  if (el) {
                    cellRefs.current[cellKey] = el;
                    textareaRef.current = el;
                  } else {
                    delete cellRefs.current[cellKey];
                  }
                }}
              value={debouncedValue.value}
              onChange={(e) => {
                debouncedValue.onChange(e.target.value, e.target as HTMLTextAreaElement);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                setIsFocused(true);
                setShowOverlay(false); // Hide overlay when focused for native selection
              }}
              onBlur={() => {
                setIsFocused(false);
                setShowOverlay(true); // Show overlay when not focused
                debouncedValue.forceUpdate(); // Force immediate save on blur
              }}
              onSelect={() => {
                setShowOverlay(false); // Hide overlay when text is selected
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setShowOverlay(false); // Hide overlay when clicking to position cursor
              }}
              onDragStart={(e) => e.preventDefault()}
              onDrag={(e) => e.preventDefault()}
              onDragEnd={(e) => e.preventDefault()}
              data-cell-id={cellKey}
              data-cell-ref={cellKey}
              data-field-key={`${itemId}-${fieldType}`}
              placeholder={fieldType === 'notes' ? 'Add notes...' : 'Add script...'}
              className={`w-full border-none bg-transparent focus:outline-none rounded px-1 py-1 text-sm resize-none overflow-hidden ${
                showOverlay ? 'text-transparent caret-transparent' : ''
              }`}
              style={{ 
                color: showOverlay ? 'transparent' : (textColor || undefined),
                minHeight: '24px',
                height: 'auto',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                position: 'relative',
                zIndex: 2
              }}
            />
            
            {/* Styled overlay with teleprompter styling */}
            {showOverlay && (
              <div 
                className="absolute inset-0 px-1 py-1 text-sm pointer-events-none"
                style={{ 
                  color: textColor || undefined,
                  minHeight: '24px',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  zIndex: 1
                }}
              >
                {debouncedValue.value ? (
                  fieldType === 'script' ? (
                    renderScriptWithBrackets(debouncedValue.value, { 
                      inlineDisplay: true, 
                      fontSize: 14,
                      showNullAsText: true // Show [null] as text in main rundown
                    })
                  ) : (
                    renderTextWithClickableUrls(debouncedValue.value)
                  )
                ) : (
                  <span className="text-muted-foreground">
                    {fieldType === 'notes' ? 'Add notes...' : 'Add script...'}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* When collapsed: show read-only preview with teleprompter styling */}
        {!effectiveExpanded && (
          <>
            {/* Hidden textarea for ref management when collapsed */}
            <textarea
              ref={(el) => {
                if (el) {
                  cellRefs.current[cellKey] = el;
                } else {
                  delete cellRefs.current[cellKey];
                }
              }}
              value={debouncedValue.value}
              data-cell-id={cellKey}
              data-cell-ref={cellKey}
              tabIndex={0}
              readOnly
              onFocus={(e) => {
                // Prevent expansion if focus happened during scrolling
                const focusTime = Date.now();
                const timeSinceLastScroll = focusTime - lastScrollTimeRef.current;
                
                // If focus occurred within 150ms of a scroll event, it's scroll-triggered
                if (timeSinceLastScroll < 150) {
                  // Blur immediately to prevent focus and expansion
                  e.target.blur();
                  return;
                }
                
                // Otherwise, it's a legitimate Tab or click - allow expansion
                if (e.relatedTarget || document.activeElement === e.target) {
                  if (onToggleExpanded && externalIsExpanded !== undefined) {
                    onToggleExpanded();
                  } else {
                    setInternalIsExpanded(true);
                  }
                  setShouldAutoFocus(true);
                }
              }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-text"
              style={{ 
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none'
              }}
            />
            {/* Visual preview with teleprompter styling */}
            <div 
              className="w-full px-1 py-1 text-sm flex items-start h-full"
              style={{ 
                color: textColor || undefined,
                minHeight: '24px',
                overflow: 'hidden'
              }}
            >
              {debouncedValue.value ? (
                <div 
                  style={{ 
                    maxWidth: '100%',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    width: '100%',
                    lineHeight: '1.25rem',
                    fontSize: '0.875rem',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: getDynamicLineClamp(),
                    WebkitBoxOrient: 'vertical'
                  }}
                >
                  {fieldType === 'script' ? (
                    renderScriptWithBrackets(debouncedValue.value.replace(/]\s*\n\s*/g, '] '), { 
                      inlineDisplay: true, 
                      fontSize: 14,
                      showNullAsText: true // Show [null] as text in main rundown
                    })
                  ) : (
                    renderTextWithClickableUrls(debouncedValue.value.replace(/]\s*\n\s*/g, '] '))
                  )}
                </div>
              ) : (
                // Only show placeholder text when collapsed and truly empty (not [null])
                <span></span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExpandableScriptCell;
