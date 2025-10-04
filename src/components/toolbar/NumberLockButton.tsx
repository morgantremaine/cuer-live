import { useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { UnlockConfirmationDialog } from '@/components/UnlockConfirmationDialog';

interface NumberLockButtonProps {
  isLocked: boolean;
  onToggle: () => void;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export const NumberLockButton = ({ 
  isLocked, 
  onToggle, 
  size = 'sm',
  className = '' 
}: NumberLockButtonProps) => {
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);

  const handleClick = () => {
    if (isLocked) {
      // Show confirmation dialog when unlocking
      setShowUnlockDialog(true);
    } else {
      // Lock immediately without confirmation
      onToggle();
    }
  };

  const handleConfirmUnlock = () => {
    onToggle();
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleClick}
              variant="outline"
              size={size}
              className={`flex items-center space-x-1 ${
                isLocked 
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' 
                  : ''
              } ${className}`}
            >
              {isLocked ? (
                <Lock className="h-4 w-4" />
              ) : (
                <Unlock className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isLocked
                ? 'Unlock to renumber rows sequentially'
                : 'Lock row numbers (new rows get letters: 6A, 6B, etc.)'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <UnlockConfirmationDialog
        open={showUnlockDialog}
        onOpenChange={setShowUnlockDialog}
        onConfirm={handleConfirmUnlock}
      />
    </>
  );
};
