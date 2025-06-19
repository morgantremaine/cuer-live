
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

interface ReplaceControlsProps {
  replaceText: string;
  onReplaceTextChange: (value: string) => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  hasMatches: boolean;
  isReplacing?: boolean;
}

const ReplaceControls = ({ 
  replaceText, 
  onReplaceTextChange, 
  onReplace, 
  onReplaceAll, 
  hasMatches,
  isReplacing = false
}: ReplaceControlsProps) => {
  return (
    <div className="space-y-3">
      <Input
        placeholder="Replace with..."
        value={replaceText}
        onChange={(e) => onReplaceTextChange(e.target.value)}
        disabled={isReplacing}
      />
      {hasMatches && (
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onReplace}
            disabled={isReplacing}
          >
            {isReplacing ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Replacing...
              </>
            ) : (
              'Replace'
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onReplaceAll}
            disabled={isReplacing}
          >
            {isReplacing ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Replacing All...
              </>
            ) : (
              'Replace All'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ReplaceControls;
