import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportRundownAsPDF = async (rundownTitle: string): Promise<void> => {
  // Find the actual rundown table to extract its structure
  const existingTable = document.querySelector('table[data-rundown-table="main"], .table-container table, .rundown-container table');
  if (!existingTable) {
    throw new Error('Could not find rundown table to export');
  }

  // Create a simplified print-only version (reuse the print logic)
  const printContent = document.createElement('div');
  printContent.id = 'pdf-export-content';
  printContent.style.position = 'absolute';
  printContent.style.top = '-9999px';
  printContent.style.left = '-9999px';
  printContent.style.width = '1200px'; // Fixed width for consistent rendering
  printContent.style.backgroundColor = 'white';
  printContent.style.padding = '20px';
  printContent.style.fontFamily = 'Arial, sans-serif';
  
  // Helper functions (copied from SharedRundownPrint for consistency)
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

  // Calculate total runtime
  const calculateTotalRuntime = () => {
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
    return '00:00:00';
  };

  // Get start time
  const getStartTime = () => {
    const startTimeInputs = document.querySelectorAll('input[type="text"]');
    for (const input of startTimeInputs) {
      const htmlInput = input as HTMLInputElement;
      if (htmlInput.placeholder === 'HH:MM:SS' && htmlInput.value) {
        return htmlInput.value;
      }
    }
    return '09:00:00';
  };

  // Extract actual table structure
  const headerRow = existingTable.querySelector('thead tr');
  const bodyRows = existingTable.querySelectorAll('tbody tr');
  
  if (!headerRow || bodyRows.length === 0) {
    throw new Error('No rundown content found to export');
  }

  // Build the export HTML using actual table structure
  let exportHTML = `
    <div style="width: 100%; background: white; color: black; font-family: Arial, sans-serif;">
      <div style="margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #333;">
        <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 10px 0; color: black;">${rundownTitle}</h1>
        <div style="font-size: 12px; color: #333; display: flex; gap: 30px;">
          <span>Start Time: ${getStartTime()}</span>
          <span>Total Runtime: ${calculateTotalRuntime()}</span>
        </div>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; background: white;">
        <thead>
          <tr>
  `;

  // Copy header structure with proper column sizing
  const headerCells = headerRow.querySelectorAll('th');
  headerCells.forEach((th, index) => {
    const thElement = th as HTMLElement;
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
    
    // Determine column width based on content type
    let columnStyle = '';
    const lowerContent = content.toLowerCase();
    
    if (content === '#' || index === 0) {
      columnStyle = 'width: 30px; max-width: 30px; white-space: nowrap;';
    } else if (lowerContent.includes('duration') || lowerContent.includes('start') || lowerContent.includes('end') || lowerContent.includes('elapsed')) {
      columnStyle = 'width: 60px; max-width: 60px; white-space: nowrap;';
    } else if (lowerContent.includes('talent') || lowerContent.includes('stage') || lowerContent.includes('source') || lowerContent.includes('gfx') || lowerContent.includes('camera') || lowerContent.includes('audio') || lowerContent.includes('video')) {
      columnStyle = 'width: 70px; max-width: 70px; white-space: nowrap;';
    } else if (lowerContent.includes('script') || lowerContent.includes('content') || lowerContent.includes('notes') || lowerContent.includes('description')) {
      columnStyle = 'min-width: 200px; width: auto;';
    } else if (lowerContent.includes('segment') || lowerContent.includes('name') || lowerContent.includes('title')) {
      columnStyle = 'width: 120px; max-width: 120px;';
    } else {
      columnStyle = 'width: 50px; max-width: 50px; white-space: nowrap;';
    }
    
    exportHTML += `<th style="background: #f5f5f5; border: 1px solid #333; padding: 8px 6px; font-weight: bold; font-size: 10px; text-align: left; color: black; ${columnStyle}">${content || ''}</th>`;
  });

  exportHTML += `
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
    
    const isHeaderRow = rowElement.classList.contains('print-header-row') || 
                       rowElement.querySelector('.print-header-row') ||
                       dataType === 'header';
    
    let backgroundColor = '#ffffff';
    
    if (isHeaderRow) {
      backgroundColor = '#f5f5f5';
    } else if (customColor || rowElement.style.backgroundColor) {
      const computedStyle = window.getComputedStyle(rowElement);
      backgroundColor = rowElement.style.backgroundColor || computedStyle.backgroundColor;
      
      if (backgroundColor && backgroundColor.startsWith('rgb')) {
        const rgbMatch = backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
          const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
          const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
          const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
          backgroundColor = `#${r}${g}${b}`;
        }
      }
      
      if (!backgroundColor || backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent') {
        backgroundColor = '#f0f8ff';
      }
    } else if (isFloated) {
      backgroundColor = '#fff8dc';
    }

    exportHTML += `<tr style="background-color: ${backgroundColor};">`;
    
    const cells = rowElement.querySelectorAll('td');
    cells.forEach((cell, cellIndex) => {
      const cellElement = cell as HTMLElement;
      
      let content = '';
      
      if (cellIndex === 0) {
        const rowNumberSpan = cellElement.querySelector('span');
        if (rowNumberSpan) {
          content = rowNumberSpan.textContent?.trim() || '';
        } else {
          content = cellElement.textContent?.trim() || '';
        }
      } else {
        const input = cellElement.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement;
        if (input && input.value) {
          content = input.value.trim();
        } else {
          const clone = cellElement.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('button, .lucide, [role="button"], .screen-only-duration').forEach(el => el.remove());
          content = clone.textContent?.trim() || '';
          
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
          let foundContent = false;
          
          const printOnlySpan = cellElement.querySelector('.print\\:inline-block, [class*="print:inline-block"]');
          if (printOnlySpan && printOnlySpan.textContent) {
            const spanText = printOnlySpan.textContent.trim();
            if (spanText && spanText.match(/\d{2}:\d{2}:\d{2}/)) {
              content = spanText;
              foundContent = true;
            }
          }
          
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
      
      content = content.replace(/\s+/g, ' ').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
      
      const cellStyle = isHeaderRow ? 
        'border: 1px solid #666; padding: 10px 6px; vertical-align: top; word-wrap: break-word; color: black; font-size: 12px; line-height: 1.4; font-weight: bold;' :
        'border: 1px solid #666; padding: 6px; vertical-align: top; word-wrap: break-word; color: black; font-size: 10px; line-height: 1.4;';
      
      exportHTML += `<td style="${cellStyle}">${content}</td>`;
    });
    
    exportHTML += `</tr>`;
  });

  exportHTML += `
        </tbody>
      </table>
    </div>
  `;

  printContent.innerHTML = exportHTML;
  document.body.appendChild(printContent);

  try {
    // Generate canvas from the content
    const canvas = await html2canvas(printContent, {
      scale: 2, // Higher quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 1200,
      height: printContent.scrollHeight
    });

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 277; // A4 landscape width in mm (minus margins)
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Add the image to PDF
    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);

    // Download the PDF
    const sanitizedTitle = rundownTitle.replace(/[^a-zA-Z0-9]/g, '_');
    pdf.save(`${sanitizedTitle}.pdf`);

  } finally {
    // Clean up
    document.body.removeChild(printContent);
  }
};