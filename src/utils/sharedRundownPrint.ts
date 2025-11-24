import { RundownItem } from '@/types/rundown';

// New function with column selection
export const handleSharedRundownPrintWithColumns = (
  rundownTitle: string,
  items: RundownItem[],
  selectedColumnIndices: number[]
) => {
  // Remove any existing print content
  const existingPrintContent = document.getElementById('shared-print-only-content');
  if (existingPrintContent) {
    existingPrintContent.remove();
  }

  const existingPrintStyles = document.getElementById('shared-rundown-print-styles');
  if (existingPrintStyles) {
    existingPrintStyles.remove();
  }

  // Find the actual rundown table to extract its structure (use same selectors as main rundown)
  const existingTable = document.querySelector('table[data-rundown-table="main"], .table-container table, .rundown-container table, table');
  if (!existingTable) {
    console.error('Could not find rundown table to print');
    return;
  }

  // Create a simplified print-only version
  const printContent = document.createElement('div');
  printContent.id = 'shared-print-only-content';
  printContent.style.display = 'none';
  
  // Helper functions
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

  const secondsToTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate total runtime (use same logic as main rundown)
  const calculateTotalRuntime = () => {
    // Look for the runtime text in the header first
    const runtimeTexts = document.querySelectorAll('*');
    for (const element of runtimeTexts) {
      const text = element.textContent?.trim();
      if (text && text.includes('Runtime:') && text.includes(':')) {
        const match = text.match(/Runtime:\s*(\d{2}:\d{2}:\d{2})/);
        if (match) {
          return match[1];
        }
      }
    }
    
    // Fallback: calculate from items if provided
    if (items?.length) {
      const totalSeconds = items.reduce((total, item) => {
        // Skip floated items - they don't count towards runtime
        if (item.isFloating || item.isFloated) {
          return total;
        }
        if (item.duration) {
          return total + timeToSeconds(item.duration);
        }
        return total;
      }, 0);
      
      return secondsToTime(totalSeconds);
    }
    
    return '00:00:00';
  };

  // Get start time from the rundown header (use same logic as main rundown)
  const getStartTime = () => {
    // Look for the start time input in the rundown header
    const startTimeInputs = document.querySelectorAll('input[type="text"]');
    for (const input of startTimeInputs) {
      const htmlInput = input as HTMLInputElement;
      if (htmlInput.placeholder === 'HH:MM:SS' && htmlInput.value) {
        return htmlInput.value;
      }
    }
    
    // Try to find start time from the visible header text
    const startTimeElements = document.querySelectorAll('*');
    for (const element of startTimeElements) {
      const text = element.textContent?.trim();
      if (text && text.includes('Start:')) {
        const match = text.match(/Start:\s*(\d{2}:\d{2}:\d{2})/);
        if (match) {
          return match[1];
        }
      }
    }
    
    return '09:00:00';
  };

  // Extract actual table structure
  const headerRow = existingTable.querySelector('thead tr');
  const bodyRows = existingTable.querySelectorAll('tbody tr');
  
  if (!headerRow || bodyRows.length === 0) {
    console.error('No rundown content found to print');
    return;
  }

  // Build the print HTML using actual table structure - keep it minimal
  let printHTML = `<div class="print-container">
<div class="print-header">
<h1>${rundownTitle}</h1>
<div class="print-info">
<span>Start Time: ${getStartTime()}</span>
<span>Total Runtime: ${calculateTotalRuntime()}</span>
</div>
</div>
<table class="print-table">
<thead>
<tr>`;

  // Copy header structure (use same approach as main rundown)
  const headerCells = headerRow.querySelectorAll('th');
  headerCells.forEach((th, index) => {
    // Only include columns that are in selectedColumnIndices
    if (!selectedColumnIndices.includes(index)) {
      return;
    }

    const thElement = th as HTMLElement;
    // Get clean header text
    let content = '';
    
    const directText = thElement.childNodes[0]?.textContent?.trim();
    if (directText && !directText.includes('undefined')) {
      content = directText;
    } else {
      const span = thElement.querySelector('span:not(.lucide)');
      const button = thElement.querySelector('button span:not(.lucide)');
      if (span) {
        content = span.textContent?.trim() || '';
      } else if (button) {
        content = button.textContent?.trim() || '';
      } else {
        content = thElement.textContent?.trim() || '';
      }
    }
    
    content = content.replace(/\s+/g, ' ').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    
    if (!content && headerCells[0] === th) {
      content = '#';
    }
    
    printHTML += `<th>${content || ''}</th>`;
  });

  printHTML += `</tr>
</thead>
<tbody>`;

  // Copy body structure with proper styling
  bodyRows.forEach(row => {
    const rowElement = row as HTMLElement;
    const dataType = rowElement.getAttribute('data-type');
    const customColor = rowElement.getAttribute('data-custom-color') === 'true';
    const isFloated = rowElement.getAttribute('data-floated') === 'true';
    
    // Check if this is a header row by CSS class (shared rundown uses classes instead of data attributes)
    const isHeaderRow = rowElement.classList.contains('print-header-row') || 
                       rowElement.querySelector('.print-header-row') ||
                       dataType === 'header';
    
    let rowClass = 'regular-row';
    let backgroundColor = '#ffffff';
    
    // Headers always get light background regardless of custom colors
    if (isHeaderRow) {
      rowClass = 'header-row';
      backgroundColor = '#f5f5f5';
    } else if (customColor || rowElement.style.backgroundColor) {
      rowClass = 'colored-row';
      // Get the actual background color from the row element
      const computedStyle = window.getComputedStyle(rowElement);
      backgroundColor = rowElement.style.backgroundColor || computedStyle.backgroundColor;
      
      // Convert RGB/RGBA to hex if needed for better print support
      if (backgroundColor && backgroundColor.startsWith('rgb')) {
        const rgbMatch = backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
          const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
          const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
          const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
          backgroundColor = `#${r}${g}${b}`;
        }
      }
      
      // If still no color found, check for any background color on the element
      if (!backgroundColor || backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent') {
        backgroundColor = '#f0f8ff'; // fallback light blue
      }
    } else if (isFloated) {
      rowClass = 'floated-row';
      backgroundColor = '#fff8dc';
    }

    printHTML += `<tr class="${rowClass}" style="background-color: ${backgroundColor};">`;
    
    const cells = rowElement.querySelectorAll('td');
    cells.forEach((cell, cellIndex) => {
      // Only include columns that are in selectedColumnIndices
      if (!selectedColumnIndices.includes(cellIndex)) {
        return;
      }

      const cellElement = cell as HTMLElement;
      
      // Extract clean content from the cell
      let content = '';
      
      // For first cell (row number), look for specific content
      if (cellIndex === 0) {
        const rowNumberSpan = cellElement.querySelector('span');
        if (rowNumberSpan) {
          content = rowNumberSpan.textContent?.trim() || '';
        } else {
          content = cellElement.textContent?.trim() || '';
        }
      } else {
        // For other cells, look for input/textarea values first, then text content
        const input = cellElement.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement;
        if (input && input.value) {
          content = input.value.trim();
        } else {
          // Get text content but exclude button text, icons, and screen-only duration
          const clone = cellElement.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('button, .lucide, [role="button"], .screen-only-duration').forEach(el => el.remove());
          content = clone.textContent?.trim() || '';
          
          // For header rows in name columns, also remove any duration in parentheses
          if (dataType === 'header') {
            const headerText = headerCells[cellIndex]?.textContent?.toLowerCase() || '';
            if (headerText.includes('segment') || headerText.includes('name')) {
              content = content.replace(/\s*\([^)]*\)\s*$/, '').trim();
            }
          }
        }
      }
      
      // For header rows, extract duration from appropriate source
      if (dataType === 'header') {
        const headerText = headerCells[cellIndex]?.textContent?.toLowerCase() || '';
        if (headerText.includes('duration') || headerText.includes('dur')) {
          // Try to get duration from the current duration column (which has print-only span)
          let foundContent = false;
          
          // Look for print-only content in the current duration cell
          const printOnlySpan = cellElement.querySelector('.print\\:inline-block, [class*="print:inline-block"]');
          if (printOnlySpan && printOnlySpan.textContent) {
            const spanText = printOnlySpan.textContent.trim();
            if (spanText && spanText.match(/\d{2}:\d{2}:\d{2}/)) {
              content = spanText;
              foundContent = true;
            }
          }
          
          // Fallback: extract duration from header name in first column
          if (!foundContent) {
            const headerRow = cellElement.closest('tr');
            const firstCell = headerRow?.querySelector('td:first-child, th:first-child');
            
            if (firstCell) {
              const firstCellText = firstCell.textContent || '';
              const durationMatch = firstCellText.match(/\((\d{2}:\d{2}:\d{2})\)/);
              if (durationMatch) {
                content = durationMatch[1];
              } else {
                content = '00:00:00';
              }
            } else {
              content = '00:00:00';
            }
          }
        }
      }
      
      // Clean up content
      content = content.replace(/\s+/g, ' ').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
      
      printHTML += `<td>${content}</td>`;
    });
    
    printHTML += `</tr>`;
  });

  printHTML += `
        </tbody>
      </table>
    </div>
  `;

  printContent.innerHTML = printHTML.trim();
  document.body.appendChild(printContent);

  // Add print styles
  const printStyles = document.createElement('style');
  printStyles.id = 'shared-rundown-print-styles';
  printStyles.textContent = `
    @media print {
      @page {
        margin: 0.5in;
        size: auto;
      }

      * {
        margin: 0 !important;
        padding: 0 !important;
      }

      body * {
        visibility: hidden;
      }

      #shared-print-only-content,
      #shared-print-only-content * {
        visibility: visible !important;
      }

      #shared-print-only-content {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        height: auto !important;
        min-height: auto !important;
        max-height: none !important;
      }

      .print-container {
        width: 100% !important;
        background: white !important;
        color: black !important;
      }

      .print-header {
        margin-bottom: 15px !important;
        padding-bottom: 8px !important;
        border-bottom: 2px solid #333 !important;
        page-break-after: avoid !important;
        page-break-inside: avoid !important;
      }

      .print-header h1 {
        font-size: 24px !important;
        font-weight: bold !important;
        margin: 0 0 10px 0 !important;
        color: black !important;
      }

      .print-info {
        font-size: 12px !important;
        color: #333 !important;
        display: flex !important;
        gap: 30px !important;
      }

      #shared-print-only-content .print-table {
        width: 100% !important;
        border-collapse: collapse !important;
        font-size: 10px !important;
        background: white !important;
        table-layout: auto !important;
      }

      #shared-print-only-content .print-table th {
        background: #f5f5f5 !important;
        border: 1px solid #333 !important;
        padding: 6px 4px !important;
        font-weight: bold !important;
        font-size: 9px !important;
        text-align: left !important;
        color: black !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      #shared-print-only-content .print-table td {
        border: 1px solid #666 !important;
        padding: 4px !important;
        vertical-align: top !important;
        word-wrap: break-word !important;
        color: black !important;
        font-size: 9px !important;
        line-height: 1.3 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .header-row {
        background: #f5f5f5 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      #shared-print-only-content .header-row td {
        font-weight: bold !important;
        font-size: 11px !important;
        padding: 8px 4px !important;
        border-left: none !important;
        border-right: none !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }

      /* Preserve custom colors */
      .colored-row {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .colored-row td {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        background: inherit !important;
        color: black !important;
      }

      .floated-row {
        background: #fff8dc !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .floated-row td {
        background: #fff8dc !important;
        color: black !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .regular-row td {
        background: white !important;
      }
      
      /* Prevent extra content and pages */
      body {
        overflow: visible !important;
      }
      
      html {
        overflow: visible !important;
      }
    }
  `;

  document.head.appendChild(printStyles);

  // Trigger print immediately
  setTimeout(() => {
    window.print();
  }, 50);

  // Clean up after print
  setTimeout(() => {
    const styles = document.getElementById('shared-rundown-print-styles');
    const content = document.getElementById('shared-print-only-content');
    if (styles) styles.remove();
    if (content) content.remove();
  }, 2000);
};

// Legacy function for backward compatibility - prints all columns
export const handleSharedRundownPrint = (rundownTitle: string, items: RundownItem[]) => {
  // Find the table to determine how many columns there are
  const existingTable = document.querySelector('table[data-rundown-table="main"], .table-container table, .rundown-container table, table');
  if (!existingTable) {
    console.error('Could not find rundown table to print');
    return;
  }
  
  const headerRow = existingTable.querySelector('thead tr');
  const headerCells = headerRow?.querySelectorAll('th');
  const columnCount = headerCells?.length || 0;
  
  // Create array of all column indices [0, 1, 2, ..., n]
  const allColumnIndices = Array.from({ length: columnCount }, (_, i) => i);
  
  // Call the new function with all columns selected
  handleSharedRundownPrintWithColumns(rundownTitle, items, allColumnIndices);
};