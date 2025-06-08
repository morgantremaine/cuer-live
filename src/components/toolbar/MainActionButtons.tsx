
import React, { useState } from 'react';
import { Plus, Settings, Share2, Monitor, FileText, Undo, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
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
  selectedRowId?: string | null;
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
  selectedRowId,
  isMobile = false
}: MainActionButtonsProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [shareMenuOpen, setShareMenuOpen] = useState(false);

  const handleShareReadOnly = () => {
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
        title: "Read-only link copied!",
        description: "Shared rundown URL has been copied to clipboard",
        variant: "default"
      });
    });
    setShareMenuOpen(false);
  };

  const handleShareExternalReview = async () => {
    if (!rundownId) {
      toast({
        title: "Cannot share rundown",
        description: "Save this rundown first before sharing.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Update the rundown visibility to 'external_review'
      const response = await fetch(`https://khdiwrkgahsbjszlwnob.supabase.co/rest/v1/rundowns?id=eq.${rundownId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoZGl3cmtnYWhzYmpzemx3bm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MzcwNTYsImV4cCI6MjA2NDIxMzA1Nn0.__Z_HYaLyyvYa5yNHwjsln3ti6sQoflRoEYCq6Agedk',
        },
        body: JSON.stringify({ visibility: 'external_review' })
      });

      if (!response.ok) {
        throw new Error('Failed to update rundown visibility');
      }

      const shareUrl = `${window.location.origin}/external-review/${rundownId}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast({
          title: "External review link copied!",
          description: "Clients can now view and add notes to this rundown",
          variant: "default"
        });
      });
    } catch (error) {
      toast({
        title: "Error creating external review link",
        description: "Please try again",
        variant: "destructive"
      });
    }
    setShareMenuOpen(false);
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
        <span>{isMobile ? 'Columns' : 'Manage Columns'}</span>
      </Button>
      
      <DropdownMenu open={shareMenuOpen} onOpenChange={setShareMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size={buttonSize} className={buttonClass}>
            <Share2 className="h-4 w-4" />
            <span>{isMobile ? 'Share' : 'Share Rundown'}</span>
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={handleShareReadOnly}>
            <Share2 className="h-4 w-4 mr-2" />
            Read-Only Share
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleShareExternalReview}>
            <FileText className="h-4 w-4 mr-2" />
            External Review
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
