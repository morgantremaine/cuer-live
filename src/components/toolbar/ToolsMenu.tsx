
import React, { useState, useEffect, useRef } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Wrench, Monitor, FileText, Camera, Search, HelpCircle, StickyNote, History, Radio } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { DEMO_RUNDOWN_ID } from '@/data/demoRundownData';
// import { RundownActionLog } from '@/components/RundownActionLog';
import { useSubscription } from '@/hooks/useSubscription';
import { RundownMOSDialog } from '@/components/integrations/RundownMOSDialog';

interface ToolsMenuProps {
  rundownId: string | undefined;
  teamId?: string;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  onShowFindReplace?: () => void;
  onShowNotes?: () => void;
  onShowHistory?: () => void;
}

export const ToolsMenu: React.FC<ToolsMenuProps> = ({
  rundownId,
  teamId,
  size = 'sm',
  className = '',
  onShowFindReplace,
  onShowNotes,
  onShowHistory
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { subscription_tier, access_type } = useSubscription();
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showMOSDialog, setShowMOSDialog] = useState(false);
  const historyButtonRef = useRef<HTMLDivElement>(null);

  // Check if user is on free tier
  const isFreeUser = (subscription_tier === 'Free' || subscription_tier === null) && 
                    (access_type === 'free' || access_type === 'none');

  useEffect(() => {
    if (showHistoryDialog && historyButtonRef.current) {
      // Find the actual button inside the RundownRevisionHistory component and click it
      const button = historyButtonRef.current.querySelector('button');
      if (button) {
        button.click();
      }
      setShowHistoryDialog(false);
    }
  }, [showHistoryDialog]);

  const handleOpenBlueprint = () => {
    if (!rundownId) {
      toast({
        title: "Cannot open blueprint",
        description: "Save this rundown first before opening blueprint.",
        variant: "destructive"
      });
      return;
    }

    // Check if this is the demo rundown
    if (rundownId === DEMO_RUNDOWN_ID) {
      toast({
        title: "Subscribe to unlock full features",
        description: "Blueprint mode is available with a subscription. Try the full experience!",
        variant: "default"
      });
      return;
    }

    navigate(`/rundown/${rundownId}/blueprint`);
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

    // Block for free tier users
    if (isFreeUser) {
      toast({
        title: "Upgrade Required",
        description: "Teleprompter is only available to Pro and Premium users. Upgrade your plan in Account Settings to unlock unlimited access.",
        variant: "destructive"
      });
      return;
    }

    // Check if this is the demo rundown
    if (rundownId === DEMO_RUNDOWN_ID) {
      toast({
        title: "Subscribe to unlock full features",
        description: "Teleprompter mode is available with a subscription. Try the full experience!",
        variant: "default"
      });
      return;
    }

    // Open teleprompter in a new window
    const teleprompterUrl = `${window.location.origin}/rundown/${rundownId}/teleprompter`;
    window.open(teleprompterUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenADView = () => {
    if (!rundownId) {
      toast({
        title: "Cannot open AD View",
        description: "Save this rundown first before opening AD View.",
        variant: "destructive"
      });
      return;
    }

    // Block for free tier users
    if (isFreeUser) {
      toast({
        title: "Upgrade Required",
        description: "AD View is only available to Pro and Premium users. Upgrade your plan in Account Settings to unlock unlimited access.",
        variant: "destructive"
      });
      return;
    }

    // Check if this is the demo rundown
    if (rundownId === DEMO_RUNDOWN_ID) {
      toast({
        title: "Subscribe to unlock full features",
        description: "AD View is available with a subscription. Try the full experience!",
        variant: "default"
      });
      return;
    }

    const adViewUrl = `${window.location.origin}/ad-view/${rundownId}`;
    window.open(adViewUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenHelp = () => {
    navigate('/help');
  };

  const handleOpenMOSSettings = () => {
    if (!rundownId) {
      toast({
        title: 'Error',
        description: 'No rundown selected',
        variant: 'destructive',
      });
      return;
    }

    if (!teamId) {
      toast({
        title: 'Error',
        description: 'Team ID not available',
        variant: 'destructive',
      });
      return;
    }

    setShowMOSDialog(true);
  };

  const handleOpenNotes = () => {
    if (!rundownId) {
      toast({
        title: "Cannot open notes",
        description: "Save this rundown first before opening notes.",
        variant: "destructive"
      });
      return;
    }

    // Check if this is the demo rundown
    if (rundownId === DEMO_RUNDOWN_ID) {
      toast({
        title: "Subscribe to unlock full features", 
        description: "Notes feature is available with a subscription. Try the full experience!",
        variant: "default"
      });
      return;
    }

    onShowNotes?.();
  };

  const handleOpenHistory = () => {
    if (!rundownId) {
      toast({
        title: "Cannot open history",
        description: "Save this rundown first.",
        variant: "destructive"
      });
      return;
    }

    if (rundownId === DEMO_RUNDOWN_ID) {
      toast({
        title: "Subscribe to unlock full features",
        description: "History is available with a subscription.",
        variant: "default"
      });
      return;
    }

    onShowHistory?.();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size={size} className={`flex items-center space-x-1 ${className}`}>
            <Wrench className="h-4 w-4" />
            <span>Tools</span>
        </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {onShowFindReplace && (
            <>
              <DropdownMenuItem onClick={onShowFindReplace}>
                <Search className="h-4 w-4 mr-2" />
                Find & Replace
              </DropdownMenuItem>
            </>
          )}
          
          <DropdownMenuItem onClick={handleOpenNotes}>
            <StickyNote className="h-4 w-4 mr-2" />
            Notes
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleOpenHistory}>
            <History className="h-4 w-4 mr-2" />
            History
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleOpenMOSSettings}>
            <Radio className="h-4 w-4 mr-2" />
            XPRESSION CONNECT
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleOpenADView}>
            <Camera className="h-4 w-4 mr-2" />
            AD View
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* History - only show for non-demo rundowns */}
          {/* Temporarily disabled due to memory concerns with large rundowns
          {rundownId && rundownId !== DEMO_RUNDOWN_ID && (
            <DropdownMenuItem onClick={() => setShowHistoryDialog(true)}>
              <History className="h-4 w-4 mr-2" />
              History
            </DropdownMenuItem>
          )}
          */}
          
          <DropdownMenuItem onClick={handleOpenHelp}>
            <HelpCircle className="h-4 w-4 mr-2" />
            User Guide
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* History Dialog - hidden but ready to be triggered */}
      {/* Temporarily disabled due to memory concerns with large rundowns
      {rundownId && rundownId !== DEMO_RUNDOWN_ID && (
        <div style={{ position: 'absolute', left: '-9999px', visibility: 'hidden', pointerEvents: 'none' }}>
          <div ref={historyButtonRef}>
            <RundownActionLog 
              rundownId={rundownId} 
              onRestore={() => window.location.reload()} 
            />
          </div>
        </div>
      )}
      */}

      {rundownId && teamId && (
        <RundownMOSDialog
          open={showMOSDialog}
          onOpenChange={setShowMOSDialog}
          rundownId={rundownId}
          teamId={teamId}
        />
      )}
    </>
  );
};
