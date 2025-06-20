import React, { useState } from 'react';
import { Plus, Settings, Monitor, FileText, Undo, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ShareRundownMenu } from '@/components/ShareRundownMenu';
import { SearchReplaceDialog } from '@/components/SearchReplaceDialog';
import { CSVExportData } from '@/utils/csvExport';
import { RundownItem } from '@/types/rundown';
import { SearchMatch } from '@/types/searchReplace';

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
  // New props for search and replace
  items?: RundownItem[];
  selectedItemIds?: Set<string>;
  onApplyReplacements?: (matches: SearchMatch[]) => void;
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
  items = [],
  selectedItemIds = new Set(),
  onApplyReplacements
}: MainActionButtonsProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showSearchReplace, setShowSearchReplace] = useState(false);

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

  const handleSearchReplace = () => {
    setShowSearchReplace(true);
  };

  const handleApplySearchReplacements = (matches: SearchMatch[]) => {
    if (onApplyReplacements) {
      onApplyReplacements(matches);
    }
  };

  const buttonSize = 'sm';
  const buttonClass = isMobile ? 'flex items-center space-x-1' : 'flex items-center space-x-1';

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
      
      <Button onClick={handleSearchReplace} variant="outline" size={buttonSize} className={buttonClass}>
        <Search className="h-4 w-4" />
        <span>{isMobile ? 'Find' : 'Find & Replace'}</span>
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

      {/* Search and Replace Dialog */}
      <SearchReplaceDialog
        open={showSearchReplace}
        onOpenChange={setShowSearchReplace}
        items={items}
        selectedItemIds={selectedItemIds}
        onApplyReplacements={handleApplySearchReplacements}
      />
    </>
  );
};

export default MainActionButtons;
