import { RundownItem } from '@/hooks/useRundownItems';

interface ScriptPrintOptions {
  isUppercase?: boolean;
  showAllSegments?: boolean;
}

/**
 * Filters items to determine if they should be included in the teleprompter/script print
 */
export const shouldIncludeInScript = (item: RundownItem, showAllSegments: boolean = false) => {
  // Exclude floated items from teleprompter
  if (item.isFloating || item.isFloated) {
    return false;
  }
  
  if (showAllSegments) {
    // Show all segments when toggle is on
    return true;
  } else {
    // Original logic - only show items with script content
    if (!item.script) return false;
    const trimmedScript = item.script.trim();
    if (trimmedScript === '') return false;
    // Include items with [null] marker (case-insensitive) or any other content
    return true;
  }
};

/**
 * Calculates the row number for a given item index
 */
const getRowNumber = (items: RundownItem[], index: number): string => {
  if (!items || index < 0 || index >= items.length) {
    return '';
  }
  
  const currentItem = items[index];
  
  // Headers don't have row numbers
  if (currentItem?.type === 'header') {
    return '';
  }
  
  // Use the calculated rowNumber if available (from calculateItemsWithTiming)
  // Otherwise fall back to stored rowNumber for consistency
  return (currentItem as any).calculatedRowNumber || currentItem.rowNumber || '';
};

/**
 * Processes script text for print with colored brackets
 */
const processScriptForPrint = (text: string, isUppercase: boolean = false): string => {
  // Handle [null] case (case-insensitive) - don't show any script content in print
  if (text.trim().toLowerCase() === '[null]') {
    return '';
  }

  const bracketRegex = /\[([^\[\]{}]+)(?:\{([^}]+)\})?\]/g;
  
  let result = '';
  let lastIndex = 0;
  let match;

  // Helper function to format text (with uppercase if needed)
  const formatText = (text: string) => {
    return isUppercase ? text.toUpperCase() : text;
  };

  while ((match = bracketRegex.exec(text)) !== null) {
    // Add text before the bracket
    if (match.index > lastIndex) {
      result += formatText(text.slice(lastIndex, match.index));
    }

    const bracketText = match[1];
    const colorName = match[2]?.toLowerCase();

    if (colorName) {
      // Apply color for brackets with custom colors
      const colorMap: { [key: string]: string } = {
        'red': '#ef4444',
        'blue': '#3b82f6',
        'green': '#22c55e',
        'yellow': '#eab308',
        'purple': '#a855f7',
        'orange': '#f97316',
        'pink': '#ec4899',
        'gray': '#6b7280',
        'grey': '#6b7280',
        'cyan': '#06b6d4',
        'lime': '#84cc16',
        'indigo': '#6366f1',
        'teal': '#14b8a6',
        'amber': '#f59e0b',
        'emerald': '#10b981',
        'violet': '#8b5cf6',
        'rose': '#f43f5e',
        'slate': '#64748b',
        'stone': '#78716c',
        'neutral': '#737373',
        'zinc': '#71717a'
      };
      
      const backgroundColor = colorMap[colorName] || colorName;
      result += `<span style="background-color: ${backgroundColor}; color: white; padding: 2px 6px; border-radius: 3px; margin: 0 2px;">${formatText(bracketText)}</span>`;
    } else {
      // Keep normal brackets as text
      result += `[${formatText(bracketText)}]`;
    }

    lastIndex = bracketRegex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result += formatText(text.slice(lastIndex));
  }

  return result;
};

/**
 * Opens a print dialog with the rundown script in a clean, print-friendly format
 */
export const printRundownScript = (
  title: string,
  items: RundownItem[],
  options: ScriptPrintOptions = {}
) => {
  const { isUppercase = false, showAllSegments = false } = options;

  // Filter items using the same logic as display
  const itemsWithScript = items.map((item, originalIndex) => ({
    ...item,
    originalIndex
  })).filter((item) => shouldIncludeInScript(item, showAllSegments));
  
  // Create print window
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Failed to open print window');
    return;
  }

  // Helper function to format text (with uppercase if needed)
  const formatText = (text: string) => {
    return isUppercase ? text.toUpperCase() : text;
  };

  // Generate HTML for print with proper page flow
  const printHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - Teleprompter Script</title>
        <style>
          @media print {
            @page {
              margin: 0.5in;
              size: letter;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: Arial, sans-serif;
            color: black;
            background: white;
            line-height: 1.5;
            font-size: 14px;
            margin: 0;
            padding: 0;
          }
          .script-container {
            max-width: 100%;
            width: 100%;
          }
          .script-item {
            margin-bottom: 1.5em;
            break-inside: avoid-column;
          }
          .segment-header {
            font-weight: bold;
            font-size: 13px;
            margin-bottom: 0.5em;
            color: #333;
            break-after: avoid;
          }
          .script-content {
            font-size: 14px;
            line-height: 1.5;
            text-align: left;
            white-space: pre-wrap;
            margin-bottom: 0;
          }
          .header-item {
            margin: 1.5em 0 1em 0;
          }
          .header-item .segment-header {
            font-size: 14px;
            font-weight: bold;
            color: #000;
          }
          /* Ensure no orphaned headers */
          .script-item:last-child {
            margin-bottom: 0;
          }
        </style>
      </head>
      <body>
        <div class="script-container">
          ${itemsWithScript.map((item) => {
            const rowNumber = getRowNumber(items, item.originalIndex);
            const isHeader = item.type === 'header';
            
            // For headers, show both the row number and the header name
            const title = isHeader 
              ? `${rowNumber} - ${formatText((item.name || item.segmentName || 'HEADER').toUpperCase())}`
              : `${rowNumber} - ${formatText((item.segmentName || item.name || 'UNTITLED').toUpperCase())}`;
            
            const scriptContent = processScriptForPrint(item.script || '', isUppercase);
            
            return `
              <div class="script-item ${isHeader ? 'header-item' : ''}">
                <div class="segment-header">[${title}]</div>
                ${scriptContent ? `<div class="script-content">${scriptContent}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </body>
    </html>
  `;

  // Write content and print
  printWindow.document.write(printHTML);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};
