
import React from 'react';
import { Plus, Settings, Monitor, FileText, Undo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ShareRundownMenu } from '@/components/ShareRundownMenu';
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
  rundownData
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

  const buttonSize = 'sm';
  
  if (isMobile) {
    // Mobile layout - stacked buttons in dropdown
    return (
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
        
        {rundownId && (
          <div className="col-span-2">
            <ShareRundownMenu 
              rundownId={rundownId} 
              rundownTitle={rundownTitle}
              rundownData={rundownData}
            />
          </div>
        )}
        
        <Button onClick={handleOpenTeleprompter} variant="outline" size={buttonSize} className="flex items-center justify-start gap-2">
          <Monitor className="h-4 w-4" />
          <span>Teleprompter</span>
        </Button>
        <Button onClick={handleOpenBlueprint} variant="outline" size={buttonSize} className="flex items-center justify-start gap-2">
          <FileText className="h-4 w-4" />
          <span>Blueprint</span>
        </Button>
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
