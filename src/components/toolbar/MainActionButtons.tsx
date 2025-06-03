
import React from 'react';
import { Plus, Settings, Share2, Monitor, FileText, Undo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface MainActionButtonsProps {
  onAddRow: () => void;
  onAddHeader: () => void;
  onShowColumnManager: () => void;
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  rundownId: string | undefined;
  onOpenTeleprompter: () => void;
  isMobile?: boolean;
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
  isMobile = false
}: MainActionButtonsProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleShareRundown = () => {
    if (!rundownId) {
      toast({
        title: "Cannot share rundown",
        description: "Save this rundown first before sharing.",
        variant: "destructive"
      });
      return;
    }

    const shareUrl = `${window.location.origin}/shared/rundown/${rundownId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "Share link copied!",
        description: "Read-only rundown URL has been copied to clipboard",
        variant: "default"
      });
    });
  };

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

  const buttonSize = isMobile ? 'sm' : 'default';
  const buttonClass = isMobile ? 'flex items-center space-x-1' : 'flex items-center space-x-2';

  return (
    <>
      <Button onClick={onAddRow} variant="outline" size={buttonSize} className={buttonClass}>
        <Plus className="h-4 w-4" />
        <span>{isMobile ? 'Segment' : 'Add Segment'}</span>
      </Button>
      <Button onClick={onAddHeader} variant="outline" size={buttonSize} className={buttonClass}>
        <Plus className="h-4 w-4" />
        <span>{isMobile ? 'Header' : 'Add Header'}</span>
      </Button>
      <Button onClick={onShowColumnManager} variant="outline" size={buttonSize} className={buttonClass}>
        <Settings className="h-4 w-4" />
        <span>{isMobile ? 'Columns' : 'Manage Columns'}</span>
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
      <Button onClick={handleShareRundown} variant="outline" size={buttonSize} className={buttonClass}>
        <Share2 className="h-4 w-4" />
        <span>{isMobile ? 'Share' : 'Share Rundown'}</span>
      </Button>
      <Button onClick={onOpenTeleprompter} variant="outline" size={buttonSize} className={buttonClass}>
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
