import { Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onToggle}
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
            <span>{isLocked ? 'Locked' : 'Lock'}</span>
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
  );
};
