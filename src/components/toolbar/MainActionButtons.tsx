import React from 'react';
import { Plus, Settings, Monitor, FileText, Undo, MapPin, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ShareRundownMenu } from '@/components/ShareRundownMenu';
import PlaybackControls from './PlaybackControls';
import { CSVExportData } from '@/utils/csvExport';

interface MainActionButtonsProps {
  onAddRow: () => void;
  onAddHeader: () => void;
  onShowColumnManager: () => void;
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  rundownId: string | undefined;
  onOpenTeleprompter: () => void;
  selectedRowId?: string | null;
  isMobile?: boolean;
  rundownTitle?: string;
  rundownData?: CSVExportData;
  autoScrollEnabled?: boolean;
  onToggleAutoScroll?: () => void;
  // Playback controls props for mobile
  isPlaying?: boolean;
  currentSegmentId?: string | null;
  timeRemaining?: number;
  onPlay?: (selectedSegmentId?: string) => void;
  onPause?: () => void;
  onForward?: () => void;
  onBackward?: () => void;
  onReset?: () => void;
}

const MainActionButtons = ({
  onAddRow,
  onAddHeader,
  onShowColumnManager,
  onUndo,
  canUndo,
  lastAction,
  rundownId,
  onOpenTeleprompter,
  selectedRowId,
  isMobile = false,
  rundownTitle = 'Untitled Rundown',
  rundownData,
  autoScrollEnabled,
  onToggleAutoScroll,
  isPlaying,
  currentSegmentId,
  timeRemaining,
  onPlay,
  onPause,
  onForward,
  onBackward,
  onReset
}: MainActionButtonsProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleOpenBlueprint = () => {
    if (!rundownId) {
      toast({
        title: "Cannot open blueprint",
        description: "Save this rundown first before opening blueprint.",
        variant: "destructive"
      });
      return;
    }

    navigate(`/blueprint/${rundownId}`);
  };

  const handleOpenTeleprompter = () => {
    if (!rundownId) {
      toast({
        title: "Cannot open teleprompter",
        description: "Save this rundown first before opening teleprompter.",
        variant: "destructive"
      });
      return;
    }

    // Open teleprompter in a new window
    const teleprompterUrl = `${window.location.origin}/teleprompter/${rundownId}`;
    window.open(teleprompterUrl, '_blank', 'noopener,noreferrer');
  };

  // Calculate total runtime from rundown items
  const calculateTotalRuntime = () => {
    if (!rundownData?.items) return '00:00:00';
    
    const timeToSeconds = (timeStr: string) => {
      if (!timeStr) return 0;
      const parts = timeStr.split(':').map(Number);
      if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      } else if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
      return 0;
    };

    const totalSeconds = rundownData.items.reduce((acc, item) => {
      // Skip floated items - they don't count towards runtime
      if (item.isFloating || item.isFloated) {
        return acc;
      }
      return acc + timeToSeconds(item.duration || '00:00');
    }, 0);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handlePrint = () => {
    if (!rundownData?.items) {
      toast({
        title: "Cannot print",
        description: "No rundown data available to print.",
        variant: "destructive"
      });
      return;
    }

    // Store original body content
    const originalBodyContent = document.body.innerHTML;
    
    // Create clean print content
    const currentTime = new Date();
    const defaultStartTime = '12:00 PM';
    const totalRuntime = calculateTotalRuntime();
    
    // Generate table rows
    const tableRows = rundownData.items.map((item, index) => {
      const rowNumber = index + 1;
      const isHeader = item.type === 'header';
      const isFloated = item.isFloating || item.isFloated;
      const hasCustomColor = item.color && item.color !== '#FFFFFF' && item.color !== '#ffffff';
      
      let rowClass = '';
      let rowStyle = '';
      
      if (isHeader) {
        rowClass = 'print-header-row';
      } else if (isFloated) {
        rowClass = 'print-floated-row';
      } else if (hasCustomColor) {
        rowClass = 'print-custom-colored-row';
        rowStyle = `background-color: ${item.color} !important;`;
      }
      
      return `
        <tr class="${rowClass}" style="${rowStyle}">
          <td style="width: 40px; text-align: center; font-weight: bold; padding: 6px; border: 1px solid #666;">${rowNumber}</td>
          <td style="padding: 6px; border: 1px solid #666;">${item.segmentName || item.name || ''}</td>
          <td style="padding: 6px; border: 1px solid #666; width: 80px;">${item.duration || ''}</td>
          <td style="padding: 6px; border: 1px solid #666;">${item.talent || ''}</td>
          <td style="padding: 6px; border: 1px solid #666;">${item.notes || ''}</td>
        </tr>
      `;
    }).join('');

    // Create the print HTML
    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print - ${rundownTitle}</title>
        <style>
          @page {
            margin: 0.75in;
            size: letter;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: black;
            background: white;
          }
          
          .print-header {
            margin-bottom: 24px;
            border-bottom: 2px solid #000;
            padding-bottom: 16px;
            page-break-inside: avoid;
          }
          
          .print-header img {
            height: 32px;
            width: auto;
            margin-bottom: 12px;
          }
          
          .print-header h1 {
            font-size: 24px;
            font-weight: bold;
            margin: 0 0 8px 0;
            line-height: 1.2;
          }
          
          .print-info {
            font-size: 11px;
            margin: 4px 0;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
            font-size: 10px;
          }
          
          th {
            background: #f5f5f5;
            font-weight: bold;
            padding: 8px 6px;
            border: 1px solid #333;
            font-size: 9px;
            text-align: left;
          }
          
          td {
            padding: 6px;
            border: 1px solid #666;
            vertical-align: top;
            word-wrap: break-word;
          }
          
          tr {
            background: white;
            page-break-inside: avoid;
          }
          
          .print-header-row td {
            background: #e8e8e8 !important;
            font-weight: bold !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .print-floated-row td {
            background: #dc2626 !important;
            color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .print-custom-colored-row td {
            color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <img src="/lovable-uploads/afeee545-0420-4bb9-a4c1-cc3e2931ec3e.png" alt="Cuer Logo" />
          <h1>${rundownTitle}</h1>
          <div class="print-info">Start Time: ${defaultStartTime}</div>
          <div class="print-info">Total Runtime: ${totalRuntime}</div>
          <div class="print-info">Printed: ${currentTime.toLocaleDateString()} ${currentTime.toLocaleTimeString()}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>Segment Name</th>
              <th style="width: 80px;">Duration</th>
              <th>Talent</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    // Replace body content with print content
    document.body.innerHTML = printHTML.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] || '';
    
    // Add the print styles to head
    const printStyles = document.createElement('style');
    printStyles.textContent = printHTML.match(/<style[^>]*>([\s\S]*)<\/style>/)?.[1] || '';
    document.head.appendChild(printStyles);
    
    // Print
    window.print();
    
    // Restore original content after printing
    setTimeout(() => {
      document.body.innerHTML = originalBodyContent;
      document.head.removeChild(printStyles);
    }, 1000);
  };

  const handleToggleAutoScroll = (checked: boolean) => {
    if (onToggleAutoScroll) {
      onToggleAutoScroll();
    }
  };

  const buttonSize = 'sm';
  
  if (isMobile) {
    // Mobile layout - stacked buttons in dropdown
    return (
      <div className="space-y-3">
        {/* Main action buttons */}
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button onClick={onAddRow} variant="outline" size={buttonSize} className="flex items-center justify-start gap-2">
            <Plus className="h-4 w-4" />
            <span>Add Segment</span>
          </Button>
          <Button onClick={onAddHeader} variant="outline" size={buttonSize} className="flex items-center justify-start gap-2">
            <Plus className="h-4 w-4" />
            <span>Add Header</span>
          </Button>
          <Button 
            onClick={onUndo} 
            variant="outline" 
            size={buttonSize}
            disabled={!canUndo}
            title={lastAction ? `Undo: ${lastAction}` : 'Nothing to undo'}
            className="flex items-center justify-start gap-2"
          >
            <Undo className="h-4 w-4" />
            <span>Undo</span>
          </Button>
          <Button onClick={onShowColumnManager} variant="outline" size={buttonSize} className="flex items-center justify-start gap-2">
            <Settings className="h-4 w-4" />
            <span>Columns</span>
          </Button>
          
          <Button onClick={handlePrint} variant="outline" size={buttonSize} className="flex items-center justify-start gap-2">
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </Button>
          <Button onClick={handleOpenTeleprompter} variant="outline" size={buttonSize} className="flex items-center justify-start gap-2">
            <Monitor className="h-4 w-4" />
            <span>Teleprompter</span>
          </Button>
          <Button onClick={handleOpenBlueprint} variant="outline" size={buttonSize} className="flex items-center justify-start gap-2">
            <FileText className="h-4 w-4" />
            <span>Blueprint</span>
          </Button>
        </div>

        {/* Share menu */}
        {rundownId && (
          <div className="w-full">
            <ShareRundownMenu 
              rundownId={rundownId} 
              rundownTitle={rundownTitle}
              rundownData={rundownData}
            />
          </div>
        )}

        {/* Playback controls - only in mobile view */}
        {isPlaying !== undefined && onPlay && onPause && onForward && onBackward && onReset && (
          <div className="border-t pt-3">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 font-medium">Playback Controls</div>
            <div className="flex justify-center">
              <PlaybackControls
                selectedRowId={selectedRowId}
                isPlaying={isPlaying}
                currentSegmentId={currentSegmentId}
                timeRemaining={timeRemaining || 0}
                onPlay={onPlay}
                onPause={onPause}
                onForward={onForward}
                onBackward={onBackward}
                onReset={onReset}
                size="sm"
              />
            </div>
          </div>
        )}

        {/* Autoscroll Toggle - only in mobile view */}
        {onToggleAutoScroll && (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between p-2 rounded-md border border-input bg-background">
              <div className="flex items-center gap-2">
                <MapPin className={`h-4 w-4 transition-colors ${autoScrollEnabled ? 'text-blue-500' : 'text-gray-400'}`} />
                <span className="text-sm">Auto-scroll</span>
              </div>
              <Switch
                checked={autoScrollEnabled}
                onCheckedChange={handleToggleAutoScroll}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop layout - horizontal buttons
  const buttonClass = 'flex items-center space-x-1';
  return (
    <>
      <Button onClick={onAddRow} variant="outline" size={buttonSize} className={buttonClass}>
        <Plus className="h-4 w-4" />
        <span>Add Segment</span>
      </Button>
      <Button onClick={onAddHeader} variant="outline" size={buttonSize} className={buttonClass}>
        <Plus className="h-4 w-4" />
        <span>Add Header</span>
      </Button>
      <Button 
        onClick={onUndo} 
        variant="outline" 
        size={buttonSize}
        disabled={!canUndo}
        title={lastAction ? `Undo: ${lastAction}` : 'Nothing to undo'}
        className={buttonClass}
      >
        <Undo className="h-4 w-4" />
        <span>Undo</span>
      </Button>
      <Button onClick={onShowColumnManager} variant="outline" size={buttonSize} className={buttonClass}>
        <Settings className="h-4 w-4" />
        <span>Manage Columns</span>
      </Button>
      
      {rundownId && (
        <ShareRundownMenu 
          rundownId={rundownId} 
          rundownTitle={rundownTitle}
          rundownData={rundownData}
        />
      )}
      
      <Button onClick={handlePrint} variant="outline" size={buttonSize} className={buttonClass}>
        <Printer className="h-4 w-4" />
        <span>Print</span>
      </Button>
      <Button onClick={handleOpenTeleprompter} variant="outline" size={buttonSize} className={buttonClass}>
        <Monitor className="h-4 w-4" />
        <span>Teleprompter</span>
      </Button>
      <Button onClick={handleOpenBlueprint} variant="outline" size={buttonSize} className={buttonClass}>
        <FileText className="h-4 w-4" />
        <span>Blueprint</span>
      </Button>
    </>
  );
};

export default MainActionButtons;
