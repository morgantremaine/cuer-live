import { RundownItem } from '@/types/rundown';

export const handleSharedRundownPrint = (rundownTitle: string, items: RundownItem[]) => {
  // Remove any existing print content
  const existingPrintContent = document.getElementById('shared-print-only-content');
  if (existingPrintContent) {
    existingPrintContent.remove();
  }

  const existingPrintStyles = document.getElementById('shared-rundown-print-styles');
  if (existingPrintStyles) {
    existingPrintStyles.remove();
  }

  // Find the actual rundown table to extract its structure
  const existingTable = document.querySelector('.print-table, table');
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

  // Calculate total runtime from items
  const calculateTotalRuntime = () => {
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

  // Get start time from the rundown header or default
  const getStartTime = () => {
    // Try to find start time from the visible header
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

  // Build the print HTML using actual table structure
  let printHTML = `
    <div class="print-container">
      <div class="print-header">
        <h1>${rundownTitle}</h1>
        <div class="print-info">
          <span>Start Time: ${getStartTime()}</span>
          <span>Total Runtime: ${calculateTotalRuntime()}</span>
        </div>
      </div>
      <table class="print-table">
        <thead>
          <tr>
  `;

  // Copy header structure
  const headerCells = headerRow.querySelectorAll('th');
  headerCells.forEach(th => {
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

  printHTML += `
          </tr>
        </thead>
        <tbody>
  `;

  // Copy body structure with proper styling
  bodyRows.forEach(row => {
    const rowElement = row as HTMLElement;
    const dataType = rowElement.getAttribute('data-type');
    const customColor = rowElement.getAttribute('data-custom-color') === 'true';
    const isFloated = rowElement.getAttribute('data-floated') === 'true';
    
    let rowClass = 'regular-row';
    let backgroundColor = '#ffffff';
    
    if (dataType === 'header') {
      rowClass = 'header-row';
      backgroundColor = '#e8e8e8';
    } else if (customColor) {
      rowClass = 'colored-row';
      backgroundColor = rowElement.style.backgroundColor || '#f0f8ff';
    } else if (isFloated) {
      rowClass = 'floated-row';
      backgroundColor = '#fff8dc';
    }

    printHTML += `<tr class="${rowClass}" style="background-color: ${backgroundColor};">`;
    
    const cells = rowElement.querySelectorAll('td');
    cells.forEach((cell, cellIndex) => {
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
          // Get text content but exclude button text and icons
          const clone = cellElement.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('button, .lucide, [role="button"]').forEach(el => el.remove());
          content = clone.textContent?.trim() || '';
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

  printContent.innerHTML = printHTML;
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
        background: white !important;
      }

      .print-container {
        width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
        background: white !important;
      }

      .print-header {
        margin-bottom: 20px !important;
        border-bottom: 2px solid #333 !important;
        padding-bottom: 10px !important;
      }

      .print-header h1 {
        font-size: 24px !important;
        font-weight: bold !important;
        margin: 0 0 10px 0 !important;
        color: #000 !important;
      }

      .print-info {
        display: flex !important;
        justify-content: space-between !important;
        font-size: 14px !important;
        color: #000 !important;
      }

      .print-table {
        width: 100% !important;
        border-collapse: collapse !important;
        font-size: 11px !important;
        color: #000 !important;
        background: white !important;
      }

      .print-table th,
      .print-table td {
        border: 1px solid #333 !important;
        padding: 6px 4px !important;
        text-align: left !important;
        vertical-align: top !important;
        word-wrap: break-word !important;
        background: inherit !important;
        color: #000 !important;
      }

      .print-table th {
        background: #e8e8e8 !important;
        font-weight: bold !important;
        text-align: center !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .header-row {
        background: #e8e8e8 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .header-row td {
        font-weight: bold !important;
        background: #e8e8e8 !important;
        color: #000 !important;
      }

      .colored-row {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .floated-row {
        background: #fff8dc !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .floated-row td {
        background: #fff8dc !important;
        color: #000 !important;
      }

      .regular-row {
        background: white !important;
      }

      .regular-row td {
        background: white !important;
        color: #000 !important;
      }
    }
  `;

  document.head.appendChild(printStyles);

  // Trigger print
  setTimeout(() => {
    window.print();
    
    // Clean up after print
    setTimeout(() => {
      const content = document.getElementById('shared-print-only-content');
      const styles = document.getElementById('shared-rundown-print-styles');
      if (content) content.remove();
      if (styles) styles.remove();
    }, 100);
  }, 100);
};